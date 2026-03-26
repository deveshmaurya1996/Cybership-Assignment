import type { HttpClient } from "../core/interfaces/http-client";
import type { StringCache } from "../core/interfaces/cache";
import type { AppEnv } from "../infrastructure/config/env";
import { RateService } from "../application/services/rate.service";
import { createCarrier, type CarrierKey } from "./carrier.factory";

export function createRateService(
  carrierKey: CarrierKey,
  deps: { http: HttpClient; cache: StringCache; env: AppEnv }
): RateService {
  const carrier = createCarrier(carrierKey, deps);
  return new RateService(carrier, deps.env.UPS_SHIPPER_NUMBER);
}
