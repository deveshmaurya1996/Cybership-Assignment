import { CarrierError } from "../../core/errors/carrier-error";
import { upsErrorEnvelopeSchema } from "./ups.types";

export function upsHttpError(
  status: number,
  body: unknown,
  carrierId: string
): CarrierError {
  const parsed = upsErrorEnvelopeSchema.safeParse(body);
  const errors = parsed.success ? parsed.data.response?.errors : undefined;
  const first = errors?.[0];
  const msg =
    first?.message ??
    (typeof body === "string" ? body : JSON.stringify(body)).slice(0, 500);

  if (status === 401) {
    return new CarrierError("UNAUTHORIZED", msg || "UPS rejected the bearer token", {
      carrierId,
      httpStatus: status,
      details: {
        upsErrorCode: first?.code,
        upsErrors: errors,
      },
    });
  }

  if (status === 429) {
    return new CarrierError("RATE_LIMITED", msg || "UPS rate limit exceeded", {
      carrierId,
      httpStatus: status,
      details: { upsErrors: errors },
    });
  }

  if (status >= 500) {
    return new CarrierError("HTTP_ERROR", msg || "UPS server error", {
      carrierId,
      httpStatus: status,
      details: { upsErrors: errors },
    });
  }

  return new CarrierError("CARRIER_ERROR", msg || `UPS request failed with status ${status}`, {
    carrierId,
    httpStatus: status,
    details: {
      upsErrorCode: first?.code,
      upsErrors: errors,
    },
  });
}
