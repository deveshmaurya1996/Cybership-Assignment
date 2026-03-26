import { z } from "zod";

function emptyAsUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "string" && v.trim() === "") return undefined;
    return v;
  }, schema);
}

const envSchema = z.object({
  UPS_API_BASE_URL: emptyAsUndefined(z.string().url()).default("https://wwwcie.ups.com/api"),
  UPS_OAUTH_TOKEN_URL: emptyAsUndefined(z.string().url()).default(
    "https://wwwcie.ups.com/security/v1/oauth/token"
  ),
  UPS_CLIENT_ID: emptyAsUndefined(z.string().min(1)),
  UPS_CLIENT_SECRET: emptyAsUndefined(z.string().min(1)),
  UPS_SHIPPER_NUMBER: emptyAsUndefined(z.string().regex(/^\d{6}$/)),
  UPS_RATING_VERSION: emptyAsUndefined(z.string().min(1)).default("v2409"),
  UPS_TRANSACTION_SOURCE: emptyAsUndefined(z.string().min(1).max(512)).default(
    "cybership-carrier-integration"
  ),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(30_000),
  UPS_TOKEN_SKEW_SECONDS: z.coerce.number().int().min(0).max(3600).default(60),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(processEnv: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(processEnv);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  return parsed.data;
}
