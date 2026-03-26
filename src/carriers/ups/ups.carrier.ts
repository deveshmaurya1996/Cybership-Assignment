import type { Carrier } from "../../core/interfaces/carrier";
import type { RateQuote, RateRequest } from "../../core/models/rate.types";
import { CarrierError } from "../../core/errors/carrier-error";
import { RATE_SHOP_REQUEST_OPTION } from "./ups-api-spec";
import { UpsRatingClient } from "./ups.client";
import { buildUpsRateRequestPayload, mapUpsRateResponseToQuotes } from "./ups.mapper";

export type UpsCarrierConfig = {
  shipperNumber: string;
  transactionContextPrefix: string;
};

export class UpsCarrier implements Carrier {
  readonly id = "ups";

  constructor(
    private readonly rating: UpsRatingClient,
    private readonly cfg: UpsCarrierConfig
  ) {}

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const shipper = request.shipperAccountNumber ?? this.cfg.shipperNumber;
    if (!/^\d{6}$/.test(shipper)) {
      throw new CarrierError("VALIDATION_FAILED", "UPS shipper account number must be six digits", {
        carrierId: this.id,
      });
    }
    const ctx = `${this.cfg.transactionContextPrefix}:${Date.now()}`;
    const payload = buildUpsRateRequestPayload(request, shipper, ctx, RATE_SHOP_REQUEST_OPTION);
    const raw = await this.rating.rate(payload, RATE_SHOP_REQUEST_OPTION);
    return mapUpsRateResponseToQuotes(this.id, raw);
  }
}
