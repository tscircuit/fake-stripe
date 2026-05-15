import type { Middleware } from "winterspec"
import { stripeError } from "../utils"

export const withStripeErrors: Middleware = async (req, ctx, next) => {
  try {
    return await next(req, ctx)
  } catch (error) {
    if (isWinterSpecHttpException(error)) {
      if (error.status === 405) {
        return stripeError("Unknown route", 404)
      }

      return stripeError(error.message, error.status)
    }

    throw error
  }
}

function isWinterSpecHttpException(
  error: unknown,
): error is { message: string; status: number; _isHttpException: true } {
  return (
    typeof error === "object" &&
    error != null &&
    "_isHttpException" in error &&
    "message" in error &&
    "status" in error &&
    typeof error.message === "string" &&
    typeof error.status === "number"
  )
}
