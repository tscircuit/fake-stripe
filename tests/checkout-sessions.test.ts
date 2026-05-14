import { afterEach, expect, test } from "bun:test";
import { StripeServer, type CheckoutSession } from "../lib/index";

let server: StripeServer | undefined;

afterEach(async () => {
  await server?.stop();
  server = undefined;
});

test("creates a checkout session with json body", async () => {
  server = new StripeServer();
  await server.start();

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
  });

  expect(response.status).toBe(200);

  const session = (await response.json()) as CheckoutSession;
  expect(session.id).toStartWith("cs_test_");
  expect(session.object).toBe("checkout.session");
  expect(session.client_reference_id).toBe("order_123");
  expect(session.metadata.order_id).toBe("order_123");
  expect(session.currency).toBe("usd");
  expect(session.status).toBe("open");
  expect(session.payment_status).toBe("unpaid");
  expect(
    (
      session.shipping_address_collection as {
        allowed_countries: string[];
      }
    ).allowed_countries[0],
  ).toBe("US");
  expect(session.url).toBe(`${server.url}/checkout/${session.id}`);
});

test("creates a checkout session with stripe-style form body", async () => {
  server = new StripeServer();
  await server.start();

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
  });

  const response = await fetch(`${server.url}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  expect(response.status).toBe(200);

  const session = (await response.json()) as CheckoutSession;
  expect(session.client_reference_id).toBe("order_form_123");
  expect(session.metadata.order_id).toBe("order_form_123");
  expect(session.currency).toBe("usd");
  expect(
    (
      session.shipping_address_collection as {
        allowed_countries: Record<string, string>;
      }
    ).allowed_countries["0"],
  ).toBe("US");
});

test("retrieves a checkout session", async () => {
  server = new StripeServer();
  await server.start();

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
  });
  const createdSession = (await createResponse.json()) as CheckoutSession;

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
  });

  const retrieveResponse = await fetch(
    `${server.url}/v1/checkout/sessions/${createdSession.id}`,
  );

  expect(retrieveResponse.status).toBe(200);

  const retrievedSession = (await retrieveResponse.json()) as CheckoutSession;
  expect(retrievedSession.id).toBe(createdSession.id);
  expect(retrievedSession.status).toBe("complete");
  expect(retrievedSession.payment_status).toBe("paid");
  expect(retrievedSession.payment_intent).toStartWith("pi_fake_");
  expect(
    (retrievedSession.customer_details as { email: string }).email,
  ).toBe("orders@example.com");
  expect(
    (
      retrievedSession.shipping_details as {
        address: { country: string };
      }
    ).address.country,
  ).toBe("US");
});

test("returns a stripe-style error for missing sessions", async () => {
  server = new StripeServer();
  await server.start();

  const response = await fetch(
    `${server.url}/v1/checkout/sessions/cs_test_missing`,
  );

  expect(response.status).toBe(404);

  const body = (await response.json()) as {
    error: { type: string; message: string };
  };
  expect(body.error.type).toBe("invalid_request_error");
  expect(body.error.message).toContain("No such checkout.session");
});
