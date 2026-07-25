import rateLimit from "express-rate-limit";

/**
 * Tight limiter for credential + OTP endpoints. Sending OTP emails and checking
 * passwords are the endpoints worth abusing (email/SMS cost, brute force), so
 * they get a low ceiling per IP; the rest of the API is unthrottled.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

/** Even tighter ceiling for the OTP-send endpoint, which triggers an email each call. */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many verification codes requested. Please wait before retrying." },
});
