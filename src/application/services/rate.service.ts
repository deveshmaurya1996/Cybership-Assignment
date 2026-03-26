import { ZodError } from "zod";
import type { Carrier } from "../../core/interfaces/carrier";
import { CarrierError } from "../../core/errors/carrier-error";
import type { RateQuote, RateRequest } from "../../core/models/rate.types";
import { rateRequestInputSchema } from "../dto/rate.schemas";

export class RateService {
  constructor(
    private readonly carrier: Carrier,
    private readonly defaultShipperAccountNumber?: string
  ) {}

  async getRates(input: unknown): Promise<RateQuote[]> {
    let parsed;
    try {
      parsed = rateRequestInputSchema.parse(input);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new CarrierError("VALIDATION_FAILED", "Rate request validation failed", {
          carrierId: this.carrier.id,
          cause: e,
        });
      }
      throw e;
    }

    const request: RateRequest = {
      origin: parsed.origin,
      destination: parsed.destination,
      packages: parsed.packages,
      serviceLevel: parsed.serviceLevel,
      shipperAccountNumber: parsed.shipperAccountNumber ?? this.defaultShipperAccountNumber,
    };

    return this.carrier.getRates(request);
  }
}
