import type { RateQuote, RateRequest } from "../models/rate.types";

export interface Carrier {
  readonly id: string;
  getRates(request: RateRequest): Promise<RateQuote[]>;
}
