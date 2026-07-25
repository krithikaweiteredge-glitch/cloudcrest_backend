import { Request, Response, NextFunction } from "express";
import { ZodError, ZodTypeAny } from "zod";

/**
 * Body-validation middleware. Parses `req.body` against a Zod schema, replaces it
 * with the parsed (typed, coerced, trimmed) value, and short-circuits with a 400
 * on failure — so handlers never see malformed input and bad data never reaches
 * the database. The error message is the first field issue, which is safe to
 * surface to the client.
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = result.error as ZodError;
      const first = err.issues[0];
      const path = first?.path?.join(".");
      const message = path ? `${path}: ${first.message}` : first?.message || "Invalid request body";
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}
