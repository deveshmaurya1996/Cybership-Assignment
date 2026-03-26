import { z } from "zod";
import type { RatingPathRequestOption } from "./ups-api-spec";

export const upsOAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.union([z.string(), z.number()]).optional(),
  token_type: z.string().optional(),
  issued_at: z.union([z.string(), z.number()]).optional(),
});

export type UpsOAuthTokenResponse = z.infer<typeof upsOAuthTokenResponseSchema>;

export const upsErrorEnvelopeSchema = z.object({
  response: z
    .object({
      errors: z
        .array(
          z.object({
            code: z.string().optional(),
            message: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
});

export type UpsErrorEnvelope = z.infer<typeof upsErrorEnvelopeSchema>;

const upsMoneySchema = z.object({
  CurrencyCode: z.string(),
  MonetaryValue: z.string(),
});

const upsRatedShipmentSchema = z.object({
  Service: z.object({
    Code: z.string(),
    Description: z.string().optional(),
  }),
  TotalCharges: upsMoneySchema.optional(),
  TransportationCharges: upsMoneySchema.optional(),
  BillingWeight: z
    .object({
      Weight: z.string(),
      UnitOfMeasurement: z
        .object({
          Code: z.string().optional(),
          Description: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  Zone: z.string().optional(),
});

export const upsRateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z.object({
      ResponseStatus: z.object({
        Code: z.string(),
        Description: z.string().optional(),
      }),
    }),
    RatedShipment: z.preprocess(
      (v) => (Array.isArray(v) ? v : v == null ? [] : [v]),
      z.array(upsRatedShipmentSchema)
    ),
  }),
});

export type UpsRateResponse = z.infer<typeof upsRateResponseSchema>;

export type UpsRateRequestWrapper = {
  RateRequest: {
    Request: {
      RequestOption: RatingPathRequestOption;
      TransactionReference?: { CustomerContext?: string };
    };
    Shipment: Record<string, unknown>;
  };
};
