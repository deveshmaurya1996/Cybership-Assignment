import type { Address, PackageDimensions, RateQuote, RateRequest } from "../../core/models/rate.types";
import type { RatingPathRequestOption } from "./ups-api-spec";
import type { UpsRateRequestWrapper, UpsRateResponse } from "./ups.types";

function toUpsAddressLines(lines: string[]): string[] {
  return lines.slice(0, 3);
}

function mapAddress(role: "Shipper" | "ShipFrom" | "ShipTo", addr: Address): Record<string, unknown> {
  const base: Record<string, unknown> = {
    Name: addr.name ?? role,
    Address: {
      AddressLine: toUpsAddressLines(addr.lines),
      City: addr.city,
      StateProvinceCode: addr.stateProvince,
      PostalCode: addr.postalCode,
      CountryCode: addr.countryCode,
    },
  };
  if (role === "ShipTo" && addr.residential) {
    (base as { ResidentialAddressIndicator?: string }).ResidentialAddressIndicator = "";
  }
  return base;
}

function mapPackage(pkg: PackageDimensions): Record<string, unknown> {
  const w = pkg.weightLb.toFixed(2);
  const l = pkg.lengthIn.toFixed(2);
  const wi = pkg.widthIn.toFixed(2);
  const h = pkg.heightIn.toFixed(2);
  return {
    PackagingType: { Code: "02", Description: "Package" },
    Dimensions: {
      UnitOfMeasurement: { Code: "IN", Description: "Inches" },
      Length: l,
      Width: wi,
      Height: h,
    },
    PackageWeight: {
      UnitOfMeasurement: { Code: "LBS", Description: "Pounds" },
      Weight: w,
    },
  };
}

export function buildUpsRateRequestPayload(
  request: RateRequest,
  shipperNumber: string,
  customerContext: string,
  requestoption: RatingPathRequestOption
): UpsRateRequestWrapper {
  const origin = request.origin;
  const destination = request.destination;

  const shipment: Record<string, unknown> = {
    Shipper: {
      Name: origin.name ?? "Shipper",
      ShipperNumber: shipperNumber,
      Address: {
        AddressLine: toUpsAddressLines(origin.lines),
        City: origin.city,
        StateProvinceCode: origin.stateProvince,
        PostalCode: origin.postalCode,
        CountryCode: origin.countryCode,
      },
    },
    ShipFrom: mapAddress("ShipFrom", origin),
    ShipTo: mapAddress("ShipTo", destination),
    PaymentDetails: {
      ShipmentCharge: [
        {
          Type: "01",
          BillShipper: { AccountNumber: shipperNumber },
        },
      ],
    },
    Package: request.packages.map((p) => mapPackage(p)),
  };

  if (request.serviceLevel) {
    shipment.Service = {
      Code: request.serviceLevel,
    };
  }

  return {
    RateRequest: {
      Request: {
        RequestOption: requestoption,
        TransactionReference: { CustomerContext: customerContext },
      },
      Shipment: shipment,
    },
  };
}

export function mapUpsRateResponseToQuotes(carrierId: string, parsed: UpsRateResponse): RateQuote[] {
  const rows = parsed.RateResponse.RatedShipment;
  return rows.map((row) => {
    const total = row.TotalCharges ?? row.TransportationCharges;
    const charge =
      total ??
      ({
        CurrencyCode: "USD",
        MonetaryValue: "0",
      } as const);
    return {
      carrierId,
      serviceCode: row.Service.Code,
      serviceName: row.Service.Description ?? row.Service.Code,
      totalCharge: {
        currency: charge.CurrencyCode,
        amount: charge.MonetaryValue,
      },
      billingWeight: row.BillingWeight
        ? {
            unitCode: row.BillingWeight.UnitOfMeasurement?.Code ?? "LBS",
            weight: row.BillingWeight.Weight,
          }
        : undefined,
      zone: row.Zone,
    };
  });
}
