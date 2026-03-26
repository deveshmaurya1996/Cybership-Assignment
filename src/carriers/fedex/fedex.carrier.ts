import type { Carrier } from "../../core/interfaces/carrier";
import type { RateQuote, RateRequest } from "../../core/models/rate.types";
import { CarrierError } from "../../core/errors/carrier-error";

export class FedExCarrier implements Carrier {
  readonly id = "fedex";

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    void request;
    throw new CarrierError(
      "CARRIER_ERROR",
      "FedEx integration is not implemented; add a FedExRatingClient and mapper behind this carrier",
      { carrierId: this.id }
    );
  }
}
