import { loadEnv } from "../../src/infrastructure/config/env";
import type { AppEnv } from "../../src/infrastructure/config/env";

export function setTestEnv(): AppEnv {
  process.env.UPS_API_BASE_URL = "https://wwwcie.ups.com/api";
  process.env.UPS_OAUTH_TOKEN_URL = "https://wwwcie.ups.com/security/v1/oauth/token";
  process.env.UPS_CLIENT_ID = "test-client-id";
  process.env.UPS_CLIENT_SECRET = "test-client-secret";
  process.env.UPS_SHIPPER_NUMBER = "123456";
  process.env.UPS_RATING_VERSION = "v2409";
  process.env.UPS_TRANSACTION_SOURCE = "integration-test";
  process.env.HTTP_TIMEOUT_MS = "30000";
  process.env.UPS_TOKEN_SKEW_SECONDS = "60";
  return loadEnv();
}
