import type { CheckoutSession } from "./types.js"

export function renderHostedCheckoutPage(session: CheckoutSession): string {
  const sessionJson = escapeScriptJson(session)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fake Stripe Checkout</title>
    <style>${checkoutStyles}</style>
  </head>
  <body>
    <main data-testid="fake-stripe-checkout">
      <section>
        <h1>Fake Stripe Checkout</h1>
        <p class="muted">Session <span id="session-id"></span></p>

        <h2>Order</h2>
        <div class="line-items" id="line-items"></div>
        <div class="total">
          <span>Total</span>
          <span id="total"></span>
        </div>
      </section>

      <form id="checkout-form">
        <label>
          Email
          <input name="email" type="email" autocomplete="email" required />
        </label>
        <label>
          Name
          <input name="name" autocomplete="name" required />
        </label>
        <label>
          Address
          <input name="line1" autocomplete="address-line1" required />
        </label>
        <div class="grid">
          <label>
            City
            <input name="city" autocomplete="address-level2" required />
          </label>
          <label>
            State
            <input name="state" autocomplete="address-level1" required />
          </label>
        </div>
        <div class="grid">
          <label>
            ZIP
            <input name="postal_code" autocomplete="postal-code" required />
          </label>
          <label>
            Country
            <select name="country" autocomplete="country" required>
              <option value="US">United States</option>
              <option value="IN">India</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
            </select>
          </label>
        </div>
        <button type="submit">Pay</button>
        <a class="button" id="cancel-link" href="#">Cancel</a>
        <p class="error" id="error" role="alert"></p>
      </form>
    </main>

    <script>
      const initialSession = ${sessionJson};
      const sessionId = initialSession.id;

      const formatMoney = (amount, currency) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency || "usd",
        }).format((Number(amount) || 0) / 100);

      const asArray = (value) => {
        if (Array.isArray(value)) return value;
        if (value && typeof value === "object") return Object.values(value);
        return [];
      };

      const resolveRedirectUrl = (url) => {
        if (!url) return "/checkout/" + encodeURIComponent(sessionId) + "/complete";
        return url.replace("{CHECKOUT_SESSION_ID}", encodeURIComponent(sessionId));
      };

      const renderSession = (session) => {
        document.getElementById("session-id").textContent = session.id;

        const items = asArray(session.line_items);
        const currency =
          session.currency || items[0]?.price_data?.currency || "usd";
        const rows =
          items.length > 0
            ? items
            : [
                {
                  quantity: 1,
                  price_data: {
                    unit_amount: 0,
                    product_data: { name: "Checkout" },
                  },
                },
              ];
        let total = 0;

        document.getElementById("line-items").replaceChildren(
          ...rows.map((item) => {
            const quantity = Number(item.quantity || 1);
            const amount = Number(
              item.price_data?.unit_amount || item.amount_total || 0,
            );
            total += amount * quantity;

            const row = document.createElement("div");
            row.className = "line-item";

            const name = document.createElement("span");
            name.textContent =
              item.price_data?.product_data?.name || item.price || "Line item";

            const price = document.createElement("span");
            price.textContent = formatMoney(amount * quantity, currency);

            row.append(name, price);
            return row;
          }),
        );

        document.getElementById("total").textContent = formatMoney(
          total,
          currency,
        );
        document.getElementById("cancel-link").href = session.cancel_url || "/";
      };

      const completeCheckout = async (form) => {
        const formData = new FormData(form);

        const response = await fetch(
          "/checkout/" + encodeURIComponent(sessionId) + "/complete",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(Object.fromEntries(formData.entries())),
          },
        );

        if (!response.ok) {
          throw new Error("Unable to complete checkout");
        }

        return response.json();
      };

      renderSession(initialSession);

      fetch("/v1/checkout/sessions/" + encodeURIComponent(sessionId))
        .then((response) => (response.ok ? response.json() : initialSession))
        .then(renderSession)
        .catch(() => undefined);

      document.getElementById("checkout-form").addEventListener("submit", async (event) => {
        event.preventDefault();

        const form = event.currentTarget;
        const error = document.getElementById("error");
        const submitButton = form.querySelector("button[type='submit']");

        error.textContent = "";
        submitButton.disabled = true;
        submitButton.textContent = "Processing...";

        try {
          const completedSession = await completeCheckout(form);
          window.location.assign(resolveRedirectUrl(completedSession.success_url));
        } catch (checkoutError) {
          error.textContent =
            checkoutError instanceof Error
              ? checkoutError.message
              : "Unable to complete checkout";
          submitButton.disabled = false;
          submitButton.textContent = "Pay";
        }
      });
    </script>
  </body>
</html>`
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

const checkoutStyles = `
  :root {
    color-scheme: light;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      "Segoe UI", sans-serif;
    background: #f6f8fb;
    color: #172033;
  }

  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
  }

  main {
    width: min(920px, calc(100vw - 32px));
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
    overflow: hidden;
    border: 1px solid #d9e0ea;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 22px 60px rgba(23, 32, 51, 0.12);
  }

  section,
  form {
    padding: 32px;
  }

  section {
    background: #f9fbfd;
    border-right: 1px solid #e1e7ef;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    font-size: 24px;
    line-height: 1.25;
  }

  h2 {
    margin-top: 28px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0;
    color: #5f6f85;
  }

  .muted {
    margin-top: 8px;
    color: #637083;
  }

  .line-items {
    margin-top: 16px;
    display: grid;
    gap: 10px;
  }

  .line-item {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 12px 0;
    border-bottom: 1px solid #e5ebf3;
    font-size: 14px;
  }

  .total {
    margin-top: 18px;
    display: flex;
    justify-content: space-between;
    font-size: 18px;
    font-weight: 700;
  }

  label {
    display: grid;
    gap: 7px;
    margin-bottom: 14px;
    font-size: 13px;
    font-weight: 600;
    color: #344256;
  }

  input,
  select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #c9d3e1;
    border-radius: 6px;
    padding: 11px 12px;
    font: inherit;
    color: #172033;
    background: #fff;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  button,
  a.button {
    width: 100%;
    box-sizing: border-box;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 44px;
    border: 0;
    border-radius: 6px;
    font: inherit;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
  }

  button {
    margin-top: 8px;
    background: #172033;
    color: #fff;
  }

  a.button {
    margin-top: 12px;
    color: #344256;
    background: #eef2f7;
  }

  .error {
    min-height: 20px;
    margin-top: 12px;
    color: #b42318;
    font-size: 13px;
  }

  @media (max-width: 760px) {
    body {
      display: block;
      background: #fff;
    }

    main {
      width: 100%;
      min-height: 100vh;
      grid-template-columns: 1fr;
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }

    section {
      border-right: 0;
      border-bottom: 1px solid #e1e7ef;
    }

    section,
    form {
      padding: 24px;
    }
  }
`
