import { renderHostedCheckoutPage } from "./checkout-html-page"
import type { DbClient } from "./db/db-client"
import type {
  CheckoutSession,
  CompleteCheckoutSessionOptions,
  StripeAddress,
} from "./types"
import {
  getLineItemCurrency,
  isRecord,
  normalizeMetadata,
  parseRequestBody,
  stripeError,
} from "./utils"

export async function createCheckoutSession(
  db: DbClient,
  request: Request,
): Promise<CheckoutSession | Response> {
  const body = await parseRequestBody(request)
  const mode = body.mode ?? "payment"

  if (mode !== "payment") {
    return stripeError("Only payment mode is supported", 400)
  }

  const id = db.createId("cs_test")
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
    url: `${new URL(request.url).origin}/checkout/${id}`,
  }

  db.setCheckoutSession(session)

  return session
}

export function retrieveCheckoutSession(
  db: DbClient,
  id: string,
): CheckoutSession | Response {
  const session = db.getCheckoutSession(id)

  if (session == null) {
    return stripeError(`No such checkout.session: '${id}'`, 404)
  }

  return session
}

export function hostedCheckoutPage(db: DbClient, id: string): Response {
  const session = db.getCheckoutSession(id)

  if (session == null) {
    return stripeError(`No such checkout.session: '${id}'`, 404)
  }

  return htmlResponse(renderHostedCheckoutPage(session))
}

export async function completeHostedCheckout(
  db: DbClient,
  request: Request,
  id: string,
): Promise<CheckoutSession | Response> {
  const session = db.getCheckoutSession(id)

  if (session == null) {
    return stripeError(`No such checkout.session: '${id}'`, 404)
  }

  const details = await parseHostedCheckoutDetails(request)

  return completeCheckoutSession(db, id, details)
}

export function completeCheckoutSession(
  db: DbClient,
  id: string,
  options: CompleteCheckoutSessionOptions = {},
): CheckoutSession {
  const session = db.getCheckoutSession(id)
  if (session == null) {
    throw new Error(`Checkout Session not found: ${id}`)
  }

  const completedSession: CheckoutSession = {
    ...session,
    status: "complete",
    payment_status: "paid",
    payment_intent: session.payment_intent ?? db.createId("pi_fake"),
    customer_details: options.customer_details ?? session.customer_details,
    shipping_details: options.shipping_details ?? session.shipping_details,
  }

  db.setCheckoutSession(completedSession)

  return completedSession
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
