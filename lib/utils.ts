import type {
  CheckoutSessionLineItem,
  CheckoutSessionLineItems,
  CreateCheckoutSessionRequest,
} from "./types.js"

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers()
  headers.set("content-type", "application/json; charset=utf-8")

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  })
}

export function stripeError(message: string, status: number): Response {
  return jsonResponse(
    {
      error: {
        type: status === 404 ? "invalid_request_error" : "api_error",
        message,
      },
    },
    { status },
  )
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

export function normalizeMetadata(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry)]),
  )
}

function setNestedValue(
  target: Record<string, unknown>,
  path: string[],
  value: string,
): void {
  const [first, ...rest] = path
  if (first == null) return

  if (rest.length === 0) {
    target[first] = value
    return
  }

  const existingValue = target[first]
  if (!isRecord(existingValue)) {
    target[first] = {}
  }

  setNestedValue(target[first] as Record<string, unknown>, rest, value)
}

function parseFormKey(key: string): string[] {
  const parts: string[] = []
  const firstPart = key.match(/^[^\[]+/)?.[0]

  if (firstPart != null) {
    parts.push(firstPart)
  }

  for (const match of key.matchAll(/\[([^\]]*)\]/g)) {
    const value = match[1]
    if (typeof value === "string" && value !== "") {
      parts.push(value)
    }
  }

  return parts
}

export async function parseRequestBody(
  request: Request,
): Promise<CreateCheckoutSessionRequest> {
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const body = await request.json()
    return isRecord(body) ? body : {}
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await request.text())
    const body: Record<string, unknown> = {}

    for (const [key, value] of params.entries()) {
      setNestedValue(body, parseFormKey(key), value)
    }

    return body as CreateCheckoutSessionRequest
  }

  return {}
}

function getFirstLineItem(
  lineItems: CheckoutSessionLineItems | undefined,
): CheckoutSessionLineItem | undefined {
  if (lineItems == null) return undefined

  if (Array.isArray(lineItems)) {
    return lineItems[0]
  }

  return lineItems["0"]
}

export function getLineItemCurrency(
  lineItems: CheckoutSessionLineItems | undefined,
): string | null {
  return getFirstLineItem(lineItems)?.price_data?.currency ?? null
}
