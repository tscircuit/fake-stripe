# fake-stripe

A small Bun-based fake Stripe server for tests. It currently implements the
minimal Checkout Session API surface needed for quick-order flows:

- `POST /v1/checkout/sessions`
- `GET /v1/checkout/sessions/:id`

## Usage

```ts
import { StripeServer } from "fake-stripe";

const stripe = new StripeServer();
await stripe.start();

const response = await fetch(`${stripe.url}/v1/checkout/sessions`, {
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
  }),
});

const session = await response.json();

await stripe.stop();
```

Use `completeCheckoutSession` in tests to simulate a paid Checkout Session:

```ts
stripe.completeCheckoutSession(session.id, {
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
```

## Development

```bash
bun install
```

Run tests:

```bash
bun test
```
