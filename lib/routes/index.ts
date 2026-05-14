import { stripeError } from "../utils.js"
import {
  completeHostedCheckoutRoute,
  createCheckoutSessionRoute,
  hostedCheckoutPageRoute,
  retrieveCheckoutSessionRoute,
} from "./checkout-sessions.js"
import { getHealthRoute } from "./health.js"
import type { RouteContext } from "../types.js"

export async function handleRoute(
  context: RouteContext,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === "/health") {
    return getHealthRoute()
  }

  if (url.pathname === "/v1/checkout/sessions") {
    if (request.method !== "POST") {
      return stripeError("Unknown route", 404)
    }

    return createCheckoutSessionRoute(context, request)
  }

  const sessionMatch = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)$/)
  if (sessionMatch != null) {
    if (request.method !== "GET") {
      return stripeError("Unknown route", 404)
    }

    const sessionId = sessionMatch[1]
    if (sessionId == null) {
      return stripeError("Unknown route", 404)
    }

    return retrieveCheckoutSessionRoute(context, sessionId)
  }

  const hostedCheckoutMatch = url.pathname.match(/^\/checkout\/([^/]+)$/)
  if (hostedCheckoutMatch != null) {
    if (request.method !== "GET") {
      return stripeError("Unknown route", 404)
    }

    const sessionId = hostedCheckoutMatch[1]
    if (sessionId == null) {
      return stripeError("Unknown route", 404)
    }

    return hostedCheckoutPageRoute(context, sessionId)
  }

  const completeCheckoutMatch = url.pathname.match(
    /^\/checkout\/([^/]+)\/complete$/,
  )
  if (completeCheckoutMatch != null) {
    if (request.method !== "POST") {
      return stripeError("Unknown route", 404)
    }

    const sessionId = completeCheckoutMatch[1]
    if (sessionId == null) {
      return stripeError("Unknown route", 404)
    }

    return completeHostedCheckoutRoute(context, request, sessionId)
  }

  return stripeError("Unknown route", 404)
}
