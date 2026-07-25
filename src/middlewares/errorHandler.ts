import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

/**
 * An error a handler intentionally raised, with a safe client-facing message and
 * HTTP status. Anything that isn't an AppError is treated as unexpected and its
 * details are never sent to the client.
 */
export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AppError";
  }
}

/** 404 for any unmatched route, in the same JSON shape as other errors. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

/**
 * Terminal error handler. Known AppErrors pass their message through; everything
 * else is logged server-side and returned as a generic 500 so raw DB / internal
 * messages never leak to clients.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Express needs the 4-arg signature to treat this as an error handler.
  _next: NextFunction,
) {
  if (res.headersSent) return;

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: "Something went wrong. Please try again.",
    ...(env.isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  });
}

/**
 * Wraps an async route handler so a rejected promise reaches errorHandler
 * instead of crashing the process as an unhandled rejection.
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
