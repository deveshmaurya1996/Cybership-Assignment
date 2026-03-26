export type CarrierErrorCode =
  | "VALIDATION_FAILED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "PARSE_ERROR"
  | "CARRIER_ERROR";

export type CarrierErrorDetails = {
  readonly upsErrorCode?: string;
  readonly upsErrors?: ReadonlyArray<{ code?: string; message?: string }>;
  readonly requestId?: string;
};

export class CarrierError extends Error {
  readonly code: CarrierErrorCode;
  readonly carrierId?: string;
  readonly httpStatus?: number;
  readonly details?: CarrierErrorDetails;
  readonly cause?: unknown;

  constructor(
    code: CarrierErrorCode,
    message: string,
    opts?: {
      carrierId?: string;
      httpStatus?: number;
      details?: CarrierErrorDetails;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "CarrierError";
    this.code = code;
    this.carrierId = opts?.carrierId;
    this.httpStatus = opts?.httpStatus;
    this.details = opts?.details;
    this.cause = opts?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
