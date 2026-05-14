import type {
  CheckoutSession,
  CompleteCheckoutSessionOptions,
  StripeServerOptions,
} from "./types";
import {
  getLineItemCurrency,
  jsonResponse,
  normalizeMetadata,
  parseRequestBody,
  stripeError,
} from "./utils";

export type {
  CheckoutSession,
  CompleteCheckoutSessionOptions,
  CreateCheckoutSessionRequest,
  StripeServerOptions,
} from "./types";

export class StripeServer {
  readonly hostname: string;
  readonly port: number;
  server: Bun.Server<undefined> | undefined;
  serverUrl: string | undefined;
  checkoutSessions = new Map<string, CheckoutSession>();

  constructor(options: StripeServerOptions = {}) {
    this.hostname = options.hostname ?? "127.0.0.1";
    this.port = options.port ?? 0;
  }

  get url(): string {
    if (this.serverUrl == null) {
      throw new Error("StripeServer has not been started");
    }

    return this.serverUrl;
  }

  async start(): Promise<string> {
    if (this.server != null) {
      return this.url;
    }

    this.server = Bun.serve({
      hostname: this.hostname,
      port: this.port,
      fetch: this.handleRequest,
    });
    this.serverUrl = `http://${this.hostname}:${this.server.port}`;

    return this.url;
  }

  async stop(): Promise<void> {
    this.server?.stop(true);
    this.server = undefined;
    this.serverUrl = undefined;
    this.checkoutSessions.clear();
  }

  getCheckoutSession(id: string): CheckoutSession | undefined {
    return this.checkoutSessions.get(id);
  }

  completeCheckoutSession(
    id: string,
    options: CompleteCheckoutSessionOptions = {},
  ): CheckoutSession {
    const session = this.checkoutSessions.get(id);
    if (session == null) {
      throw new Error(`Checkout Session not found: ${id}`);
    }

    const completedSession: CheckoutSession = {
      ...session,
      status: "complete",
      payment_status: "paid",
      payment_intent:
        session.payment_intent ?? `pi_fake_${crypto.randomUUID()}`,
      customer_details: options.customer_details ?? session.customer_details,
      shipping_details: options.shipping_details ?? session.shipping_details,
    };

    this.checkoutSessions.set(id, completedSession);
    return completedSession;
  }

  handleRequest = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true });
    }

    if (url.pathname === "/") {
      return jsonResponse({
        name: "fake-stripe",
        status: "running",
      });
    }

    if (url.pathname === "/v1/checkout/sessions") {
      if (request.method !== "POST") {
        return stripeError("Unknown route", 404);
      }

      return this.createCheckoutSession(request);
    }

    const sessionMatch = url.pathname.match(
      /^\/v1\/checkout\/sessions\/([^/]+)$/,
    );
    if (sessionMatch != null) {
      if (request.method !== "GET") {
        return stripeError("Unknown route", 404);
      }

      const sessionId = sessionMatch[1];
      if (sessionId == null) {
        return stripeError("Unknown route", 404);
      }

      return this.retrieveCheckoutSession(sessionId);
    }

    return stripeError("Unknown route", 404);
  };

  async createCheckoutSession(request: Request): Promise<Response> {
    const body = await parseRequestBody(request);
    const mode = body.mode ?? "payment";

    if (mode !== "payment") {
      return stripeError("Only payment mode is supported", 400);
    }

    const id = `cs_test_${crypto.randomUUID()}`;
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
      shipping_address_collection:
        body.shipping_address_collection ?? null,
      shipping_details: null,
      customer_details: null,
      url: `${this.url}/checkout/${id}`,
    };

    this.checkoutSessions.set(id, session);

    return jsonResponse(session);
  }

  retrieveCheckoutSession(id: string): Response {
    const session = this.checkoutSessions.get(id);

    if (session == null) {
      return stripeError(`No such checkout.session: '${id}'`, 404);
    }

    return jsonResponse(session);
  }
}
