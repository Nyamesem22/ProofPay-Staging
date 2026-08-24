import { z } from "zod";

const phone = z.string().trim().min(9).max(20).transform(value => {
  const cleaned = value.replace(/[\s()-]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0") && cleaned.length === 10) return `+233${cleaned.slice(1)}`;
  return cleaned;
}).refine(value => /^\+[1-9]\d{8,14}$/.test(value), "Enter a valid mobile number with a country code.");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone,
  provider: z.enum(["MTN MoMo", "Telecel Cash", "AT Money", "Bank account"]),
  password: z.string().min(12).max(128)
    .regex(/[a-z]/, "Password must contain a lowercase letter.")
    .regex(/[A-Z]/, "Password must contain an uppercase letter.")
    .regex(/\d/, "Password must contain a number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain a symbol."),
  accepted: z.literal(true),
});

export const loginSchema = z.object({ phone, password: z.string().min(1).max(128) });

export const transactionSchema = z.object({
  receiverName: z.string().trim().min(2).max(160),
  receiverPhone: phone,
  receiverProvider: z.string().trim().min(2).max(40),
  itemDescription: z.string().trim().min(3).max(500),
  amount: z.coerce.number().positive().max(1000000),
  currency: z.string().length(3).default("GHS"),
  deliveryDueAt: z.coerce.date(),
  inspectionHours: z.coerce.number().int().min(1).max(720).default(24),
  requiredEvidence: z.string().trim().min(3).max(100),
  releaseRule: z.string().trim().min(3).max(80),
  demoMode: z.boolean().default(true),
});

export const disputeSchema = z.object({
  reason: z.enum(["Item not received", "Wrong item delivered", "Item damaged", "Service not completed", "Other"]),
  description: z.string().trim().min(10).max(3000),
});

export const staffReportSchema = z.object({
  department: z.string().trim().min(2).max(80),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().trim().min(20).max(10000),
  metrics: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  incidents: z.string().trim().max(10000).optional(),
  handover: z.string().trim().max(10000).optional(),
  status: z.enum(["DRAFT", "SUBMITTED"]).default("DRAFT"),
});


export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new Error("Please correct the highlighted information.");
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    error.details = result.error.flatten();
    throw error;
  }
  return result.data;
}
