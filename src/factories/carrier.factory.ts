import type { HttpClient } from "../core/interfaces/http-client";
import type { StringCache } from "../core/interfaces/cache";
import type { Carrier } from "../core/interfaces/carrier";
import type { AppEnv } from "../infrastructure/config/env";
import { UpsOAuthClient } from "../carriers/ups/ups.auth";
import { UpsRatingClient } from "../carriers/ups/ups.client";
import { UpsCarrier } from "../carriers/ups/ups.carrier";
import { FedExCarrier } from "../carriers/fedex/fedex.carrier";

export type CarrierKey = "ups" | "fedex";

export function createCarrier(
  key: CarrierKey,
  deps: { http: HttpClient; cache: StringCache; env: AppEnv }
): Carrier {
  const { http, cache, env } = deps;
  if (key === "fedex") {
    return new FedExCarrier();
  }

  const oauth = new UpsOAuthClient(http, cache, {
    tokenUrl: env.UPS_OAUTH_TOKEN_URL,
    clientId: env.UPS_CLIENT_ID,
    clientSecret: env.UPS_CLIENT_SECRET,
    timeoutMs: env.HTTP_TIMEOUT_MS,
    tokenSkewSeconds: env.UPS_TOKEN_SKEW_SECONDS,
  });

  const rating = new UpsRatingClient(http, oauth, {
    apiBaseUrl: env.UPS_API_BASE_URL,
    ratingVersion: env.UPS_RATING_VERSION,
    transactionSource: env.UPS_TRANSACTION_SOURCE,
    timeoutMs: env.HTTP_TIMEOUT_MS,
  });

  return new UpsCarrier(rating, {
    shipperNumber: env.UPS_SHIPPER_NUMBER,
    transactionContextPrefix: env.UPS_TRANSACTION_SOURCE,
  });
}
