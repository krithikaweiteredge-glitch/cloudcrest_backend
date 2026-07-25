import { z } from "zod";

/**
 * Request-body schemas for the write endpoints. Kept deliberately close to what
 * each controller already accepts — required fields are enforced, optional ones
 * stay optional, and complex handlers `.passthrough()` so their many optional
 * fields aren't stripped. The goal is to reject malformed input, not to
 * re-model the domain.
 */

const email = z.string().trim().email("must be a valid email").max(255);
const nonEmpty = (label: string) => z.string().trim().min(1, `${label} is required`);
// Fee-ish values arrive as strings or numbers from the admin UI.
const feeValue = z.union([z.string(), z.number()]).optional();

/* ---- Auth ---- */

export const registerSchema = z.object({
  firstName: nonEmpty("firstName").max(120),
  lastName: z.string().trim().max(120).optional(),
  email,
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(6, "password must be at least 6 characters").max(200),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "password is required").max(200),
});

export const sendOtpSchema = z.object({ email });

export const verifyOtpSchema = z
  .object({
    email,
    code: z.string().trim().regex(/^\d{6}$/, "code must be 6 digits"),
    isBusiness: z.boolean().optional(),
    companyName: z.string().trim().max(255).optional(),
    pan: z.string().trim().max(20).optional(),
    cin: z.string().trim().max(50).optional(),
    address: z.string().trim().max(1000).optional(),
    gstin: z.string().trim().max(20).optional(),
  })
  .passthrough();

export const firebaseLoginSchema = z.object({
  firebaseToken: nonEmpty("firebaseToken"),
});

/* ---- Service requests ---- */

export const createServiceRequestSchema = z
  .object({
    serviceSlug: nonEmpty("serviceSlug").max(255),
    serviceTitle: nonEmpty("serviceTitle").max(255),
    contactName: nonEmpty("contactName").max(255),
    contactEmail: email,
    contactPhone: nonEmpty("contactPhone").max(30),
    authority: z.string().trim().max(255).optional().nullable(),
    form: z.string().trim().max(255).optional().nullable(),
    businessName: z.string().trim().max(255).optional().nullable(),
    notes: z.string().trim().max(5000).optional().nullable(),
    authorisedCapital: z.union([z.string(), z.number()]).optional().nullable(),
    paidCapital: z.union([z.string(), z.number()]).optional().nullable(),
  })
  .passthrough();

/* ---- Catalog (admin) ---- */

export const categorySchema = z.object({ name: nonEmpty("name").max(255) });

export const subcategorySchema = z.object({
  categoryId: z.coerce.number().int().positive("categoryId is required"),
  name: nonEmpty("name").max(255),
});

export const createServiceSchema = z
  .object({
    subcategoryId: z.coerce.number().int().positive("subcategoryId is required"),
    name: nonEmpty("name").max(255),
    slug: z.string().trim().max(255).optional().nullable(),
    professionalFee: feeValue,
    govtFee: feeValue,
    gstPercent: feeValue,
  })
  .passthrough();

export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    slug: z.string().trim().max(255).optional().nullable(),
    professionalFee: feeValue,
    govtFee: feeValue,
    gstPercent: feeValue,
  })
  .passthrough();

export const documentTypeSchema = z.object({ name: nonEmpty("name").max(255) });

/* ---- Notifications (admin) ---- */

export const sendNotificationSchema = z
  .object({
    userId: z.coerce.number().int().positive("userId is required"),
    title: nonEmpty("title").max(255),
    message: nonEmpty("message").max(5000),
    requestId: z.coerce.number().int().positive().optional(),
  })
  .passthrough();

export const broadcastSchema = z.object({
  title: nonEmpty("title").max(255),
  message: nonEmpty("message").max(5000),
  linkUrl: z.string().trim().max(550).optional().nullable(),
});

/* ---- Support tickets ---- */

export const createTicketSchema = z
  .object({
    subject: nonEmpty("subject").max(255),
    message: nonEmpty("message").max(5000),
  })
  .passthrough();

export const ticketMessageSchema = z.object({
  message: nonEmpty("message").max(5000),
});

/* ---- Profile ---- */

export const updateProfileSchema = z.object({}).passthrough();
