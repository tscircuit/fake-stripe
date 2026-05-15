import type { Middleware } from "winterspec"
import { corsPreflightResponse, withCors } from "../utils"

export const withStripeCors: Middleware = async (req, ctx, next) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse(req)
  }

  return withCors(await next(req, ctx), req)
}
