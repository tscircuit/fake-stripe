import {
  getLineItemCurrency,
  isRecord,
  jsonResponse,
  normalizeMetadata,
  parseRequestBody,
  stripeError,
} from "../utils.js"
import { renderHostedCheckoutPage } from "../checkout-html-page.js"
import type {
  CheckoutSession,
  CompleteCheckoutSessionOptions,
  RouteContext,
  StripeAddress,
} from "../types.js"

export async function createCheckoutSessionRoute(
  context: RouteContext,
  request: Request,
): Promise<Response> {
  const body = await parseRequestBody(request)
  const mode = body.mode ?? "payment"

  if (mode !== "payment") {
    return stripeError("Only payment mode is supported", 400)
  }

  const id = context.createId("cs_test")
  const session: CheckoutSession = {
    id,
    object: "checkout.session",
    client_reference_id: body.client_reference_id ?? null,
    created: Math.floor(Date.now() / 1000),
    currency: body.currency ?? getLineItemCurrency(body.line_items),
    line_items: body.line_items ?? null,
    metadata: normalizeMetadata(body.metadata),
    mode,
    payment_intent: null,
    payment_status: "unpaid",
    status: "open",
    success_url: body.success_url ?? null,
    cancel_url: body.cancel_url ?? null,
    shipping_address_collection: body.shipping_address_collection ?? null,
    shipping_details: null,
    customer_details: null,
    url: `${context.getUrl()}/checkout/${id}`,
  }

  context.checkoutSessions.set(id, session)

  return jsonResponse(session)
}

export function retrieveCheckoutSessionRoute(
  context: RouteContext,
  id: string,
): Response {
  const session = context.checkoutSessions.get(id)

  if (session == null) {
    return stripeError(`No such checkout.session: '${id}'`, 404)
  }

  return jsonResponse(session)
}

export function hostedCheckoutPageRoute(
  context: RouteContext,
  id: string,
): Response {
  const session = context.checkoutSessions.get(id)

  if (session == null) {
    return stripeError(`No such checkout.session: '${id}'`, 404)
  }

  return htmlResponse(renderHostedCheckoutPage(session))
}

export async function completeHostedCheckoutRoute(
  context: RouteContext,
  request: Request,
  id: string,
): Promise<Response> {
  const session = context.checkoutSessions.get(id)

  if (session == null) {
    return stripeError(`No such checkout.session: '${id}'`, 404)
  }

  const details = await parseHostedCheckoutDetails(request)
  const completedSession: CheckoutSession = {
    ...session,
    status: "complete",
    payment_status: "paid",
    payment_intent: session.payment_intent ?? context.createId("pi_fake"),
    customer_details: details.customer_details ?? session.customer_details,
    shipping_details: details.shipping_details ?? session.shipping_details,
  }

  context.checkoutSessions.set(id, completedSession)

  return jsonResponse(completedSession)
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    },
  })
}

async function parseHostedCheckoutDetails(
  request: Request,
): Promise<CompleteCheckoutSessionOptions> {
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const body = await request.json()
    return completeOptionsFromBody(isRecord(body) ? body : {})
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await request.text())
    return completeOptionsFromBody(Object.fromEntries(params.entries()))
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    return completeOptionsFromBody(Object.fromEntries(formData.entries()))
  }

  return {}
}

function completeOptionsFromBody(
  body: Record<string, unknown>,
): CompleteCheckoutSessionOptions {
  if (isRecord(body.customer_details) || isRecord(body.shipping_details)) {
    return {
      customer_details: isRecord(body.customer_details)
        ? {
            address: normalizeAddress(body.customer_details.address),
            email: stringOrNull(body.customer_details.email),
            name: stringOrNull(body.customer_details.name),
            phone: stringOrNull(body.customer_details.phone),
            tax_exempt: null,
          }
        : undefined,
      shipping_details: isRecord(body.shipping_details)
        ? {
            address: normalizeAddress(body.shipping_details.address) ?? {},
            name: stringOrNull(body.shipping_details.name) ?? "Test Customer",
          }
        : undefined,
    }
  }

  const address = normalizeAddress(body) ?? {}
  const name = stringOrNull(body.name) ?? "Test Customer"

  return {
    customer_details: {
      address,
      email: stringOrNull(body.email),
      name,
      phone: stringOrNull(body.phone),
      tax_exempt: null,
    },
    shipping_details: {
      address,
      name,
    },
  }
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function normalizeAddress(value: unknown): StripeAddress | null {
  if (!isRecord(value)) {
    return null
  }

  return {
    city: stringOrNull(value.city),
    country: stringOrNull(value.country),
    line1: stringOrNull(value.line1),
    line2: stringOrNull(value.line2),
    postal_code: stringOrNull(value.postal_code),
    state: stringOrNull(value.state),
  }
}
