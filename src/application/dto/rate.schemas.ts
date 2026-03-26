import { z } from "zod";

const addressSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  lines: z
    .array(z.string().min(1).max(35))
    .min(1)
    .max(3),
  city: z.string().min(1).max(50),
  stateProvince: z.string().min(1).max(5).optional(),
  postalCode: z.string().min(1).max(20),
  countryCode: z.string().length(2),
  residential: z.boolean().optional(),
});

const packageSchema = z.object({
  weightLb: z.number().positive().max(150),
  lengthIn: z.number().positive().max(108),
  widthIn: z.number().positive().max(108),
  heightIn: z.number().positive().max(108),
});

export const rateRequestInputSchema = z.object({
  origin: addressSchema,
  destination: addressSchema,
  packages: z.array(packageSchema).min(1).max(200),
  shipperAccountNumber: z
    .string()
    .regex(/^\d{6}$/, "Shipper account must be a 6-digit UPS account")
    .optional(),
  serviceLevel: z
    .string()
    .regex(/^\d{2,3}$/, "Service level must be a UPS service code")
    .optional(),
});

export type RateRequestInput = z.infer<typeof rateRequestInputSchema>;
