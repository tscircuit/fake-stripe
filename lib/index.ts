import type {
  CheckoutSession,
  CompleteCheckoutSessionOptions,
  StripeServerOptions,
} from "./types"
import { handleRoute } from "./routes"

export type {
  CheckoutSession,
  CompleteCheckoutSessionOptions,
  CreateCheckoutSessionRequest,
  StripeServerOptions,
} from "./types"

export class StripeServer {
  readonly hostname: string
  readonly port: number
  server: Bun.Server<undefined> | undefined
  serverUrl: string | undefined
  checkoutSessions = new Map<string, CheckoutSession>()
  private nextId = 1

  constructor(options: StripeServerOptions = {}) {
    this.hostname = options.hostname ?? "127.0.0.1"
    this.port = options.port ?? 0
  }

  get url(): string {
    if (this.serverUrl == null) {
      throw new Error("StripeServer has not been started")
    }

    return this.serverUrl
  }

  async start(): Promise<string> {
    if (this.server != null) {
      return this.url
    }

    this.server = Bun.serve({
      hostname: this.hostname,
      port: this.port,
      fetch: this.handleRequest,
    })
    this.serverUrl = `http://${this.hostname}:${this.server.port}`

    return this.url
  }

  async stop(): Promise<void> {
    this.server?.stop(true)
    this.server = undefined
    this.serverUrl = undefined
    this.checkoutSessions.clear()
  }

  getCheckoutSession(id: string): CheckoutSession | undefined {
    return this.checkoutSessions.get(id)
  }

  completeCheckoutSession(
    id: string,
    options: CompleteCheckoutSessionOptions = {},
  ): CheckoutSession {
    const session = this.checkoutSessions.get(id)
    if (session == null) {
      throw new Error(`Checkout Session not found: ${id}`)
    }

    const completedSession: CheckoutSession = {
      ...session,
      status: "complete",
      payment_status: "paid",
      payment_intent: session.payment_intent ?? this.createId("pi_fake"),
      customer_details: options.customer_details ?? session.customer_details,
      shipping_details: options.shipping_details ?? session.shipping_details,
    }

    this.checkoutSessions.set(id, completedSession)
    return completedSession
  }

  handleRequest = async (request: Request): Promise<Response> => {
    return handleRoute(this, request)
  }

  createId(prefix: string): string {
    return `${prefix}_${this.nextId++}`
  }

  getUrl(): string {
    return this.url
  }
}
