import { afterEach, expect, test } from "bun:test"
import { StripeServer, type CheckoutSession } from "../lib/index.js"

let server: StripeServer | undefined

afterEach(async () => {
  await server?.stop()
  server = undefined
})

test("creates a checkout session with json body", async () => {
  server = new StripeServer()
  await server.start()

  const response = await fetch(`${server.url}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      mode: "payment",
      client_reference_id: "order_123",
      metadata: {
        order_id: "order_123",
      },
      line_items: {
        "0": {
          price_data: {
            currency: "usd",
            unit_amount: 5,
            product_data: {
              name: "pcb board",
            },
          },
          quantity: 1,
        },
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      success_url: "https://tscircuit.com/orders/order_123/success",
      cancel_url: "https://tscircuit.com/packages/example",
    }),
  })

  expect(response.status).toBe(200)

  const session = (await response.json()) as CheckoutSession
  expect(session.id).toBe("cs_test_1")
  expect(session.object).toBe("checkout.session")
  expect(session.client_reference_id).toBe("order_123")
  expect(session.metadata.order_id).toBe("order_123")
  expect(session.currency).toBe("usd")
  expect(session.status).toBe("open")
  expect(session.payment_status).toBe("unpaid")
  expect(
    (
      session.shipping_address_collection as {
        allowed_countries: string[]
      }
    ).allowed_countries[0],
  ).toBe("US")
  expect(session.url).toBe(`${server.url}/checkout/${session.id}`)
})

test("handles browser cors preflight requests", async () => {
  server = new StripeServer()
  await server.start()

  const response = await fetch(`${server.url}/v1/checkout/sessions`, {
    method: "OPTIONS",
    headers: {
      origin: "https://order-dialog.vercel.app",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  })

  expect(response.status).toBe(204)
  expect(response.headers.get("access-control-allow-origin")).toBe("*")
  expect(response.headers.get("access-control-allow-methods")).toContain("POST")
  expect(response.headers.get("access-control-allow-headers")).toBe(
    "content-type",
  )
})

test("adds cors headers to checkout session responses", async () => {
  server = new StripeServer()
  await server.start()

  const response = await fetch(`${server.url}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://order-dialog.vercel.app",
    },
    body: JSON.stringify({
      mode: "payment",
    }),
  })

  expect(response.status).toBe(200)
  expect(response.headers.get("access-control-allow-origin")).toBe("*")
})

test("creates a checkout session with stripe-style form body", async () => {
  server = new StripeServer()
  await server.start()

  const body = new URLSearchParams({
    mode: "payment",
    client_reference_id: "order_form_123",
    "metadata[order_id]": "order_form_123",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": "5",
    "line_items[0][price_data][product_data][name]": "pcb board",
    "line_items[0][quantity]": "1",
    "shipping_address_collection[allowed_countries][0]": "US",
    success_url: "https://tscircuit.com/orders/order_form_123/success",
    cancel_url: "https://tscircuit.com/packages/example",
  })

  const response = await fetch(`${server.url}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  })

  expect(response.status).toBe(200)

  const session = (await response.json()) as CheckoutSession
  expect(session.client_reference_id).toBe("order_form_123")
  expect(session.metadata.order_id).toBe("order_form_123")
  expect(session.currency).toBe("usd")
  expect(
    (
      session.shipping_address_collection as {
        allowed_countries: Record<string, string>
      }
    ).allowed_countries["0"],
  ).toBe("US")
})

test("retrieves a checkout session", async () => {
  server = new StripeServer()
  await server.start()

  const createResponse = await fetch(`${server.url}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      mode: "payment",
      client_reference_id: "order_456",
      metadata: {
        order_id: "order_456",
      },
    }),
  })
  const createdSession = (await createResponse.json()) as CheckoutSession

  server.completeCheckoutSession(createdSession.id, {
    customer_details: {
      email: "orders@example.com",
    },
    shipping_details: {
      name: "Test Customer",
      address: {
        line1: "123 Board St",
        city: "San Francisco",
        state: "CA",
        postal_code: "94107",
        country: "US",
      },
    },
  })

  const retrieveResponse = await fetch(
    `${server.url}/v1/checkout/sessions/${createdSession.id}`,
  )

  expect(retrieveResponse.status).toBe(200)

  const retrievedSession = (await retrieveResponse.json()) as CheckoutSession
  expect(retrievedSession.id).toBe(createdSession.id)
  expect(retrievedSession.status).toBe("complete")
  expect(retrievedSession.payment_status).toBe("paid")
  expect(retrievedSession.payment_intent).toBe("pi_fake_2")
  expect((retrievedSession.customer_details as { email: string }).email).toBe(
    "orders@example.com",
  )
  expect(
    (
      retrievedSession.shipping_details as {
        address: { country: string }
      }
    ).address.country,
  ).toBe("US")
})

test("serves a hosted checkout page for a checkout session", async () => {
  server = new StripeServer()
  await server.start()

  const createResponse = await fetch(`${server.url}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      mode: "payment",
      client_reference_id: "order_page_123",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 1200,
            product_data: {
              name: "fabricated pcb",
            },
          },
          quantity: 2,
        },
      ],
      success_url:
        "https://tscircuit.com/orders/order_page_123/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://tscircuit.com/orders/order_page_123/cancel",
    }),
  })
  const session = (await createResponse.json()) as CheckoutSession

  const checkoutResponse = await fetch(session.url)

  expect(checkoutResponse.status).toBe(200)
  expect(checkoutResponse.headers.get("content-type")).toContain("text/html")

  const html = await checkoutResponse.text()
  expect(html).toContain('data-testid="fake-stripe-checkout"')
  expect(html).toContain(`fetch("/v1/checkout/sessions/"`)
  expect(html).toContain(session.id)
  expect(html).toContain("fabricated pcb")
})

test("completes a hosted checkout session", async () => {
  server = new StripeServer()
  await server.start()

  const createResponse = await fetch(`${server.url}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      mode: "payment",
      client_reference_id: "order_complete_123",
      success_url:
        "https://tscircuit.com/orders/order_complete_123/success?session_id={CHECKOUT_SESSION_ID}",
    }),
  })
  const session = (await createResponse.json()) as CheckoutSession

  const completeResponse = await fetch(
    `${server.url}/checkout/${session.id}/complete`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "customer@example.com",
        name: "Test Customer",
        line1: "123 Board St",
        city: "San Francisco",
        state: "CA",
        postal_code: "94107",
        country: "US",
      }),
    },
  )

  expect(completeResponse.status).toBe(200)

  const completedSession = (await completeResponse.json()) as CheckoutSession
  expect(completedSession.id).toBe(session.id)
  expect(completedSession.status).toBe("complete")
  expect(completedSession.payment_status).toBe("paid")
  expect(completedSession.payment_intent).toBe("pi_fake_2")
  expect(completedSession.customer_details?.email).toBe("customer@example.com")
  expect(completedSession.customer_details?.address?.city).toBe("San Francisco")
  expect(completedSession.shipping_details?.name).toBe("Test Customer")
  expect(completedSession.shipping_details?.address.country).toBe("US")

  const retrieveResponse = await fetch(
    `${server.url}/v1/checkout/sessions/${session.id}`,
  )
  const retrievedSession = (await retrieveResponse.json()) as CheckoutSession

  expect(retrievedSession.status).toBe("complete")
  expect(retrievedSession.customer_details?.email).toBe("customer@example.com")
})

test("returns a stripe-style error for missing sessions", async () => {
  server = new StripeServer()
  await server.start()

  const response = await fetch(
    `${server.url}/v1/checkout/sessions/cs_test_missing`,
  )

  expect(response.status).toBe(404)

  const body = (await response.json()) as {
    error: { type: string; message: string }
  }
  expect(body.error.type).toBe("invalid_request_error")
  expect(body.error.message).toContain("No such checkout.session")
})
