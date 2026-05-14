export type StripeServerOptions = {
  hostname?: string
  port?: number
}

export type StripeMetadata = Record<string, string | number | boolean | null>

export type StripeAddress = {
  city?: string | null
  country?: string | null
  line1?: string | null
  line2?: string | null
  postal_code?: string | null
  state?: string | null
}

export type CheckoutSessionShippingAddressCollection = {
  allowed_countries: string[] | Record<string, string>
}

export type CheckoutSessionProductData = {
  name: string
  description?: string | null
  images?: string[]
  metadata?: StripeMetadata
}

export type CheckoutSessionPriceData = {
  currency: string
  unit_amount?: number | string
  unit_amount_decimal?: string
  product_data?: CheckoutSessionProductData
}

export type CheckoutSessionLineItem = {
  price?: string
  price_data?: CheckoutSessionPriceData
  quantity?: number | string
  metadata?: StripeMetadata
}

export type CheckoutSessionLineItems =
  | CheckoutSessionLineItem[]
  | Record<string, CheckoutSessionLineItem>

export type CheckoutSessionShippingDetails = {
  address: StripeAddress
  name: string
}

export type CheckoutSessionCustomerDetails = {
  address?: StripeAddress | null
  email?: string | null
  name?: string | null
  phone?: string | null
  tax_exempt?: "exempt" | "none" | "reverse" | null
}

export type CheckoutSession = {
  id: string
  object: "checkout.session"
  client_reference_id: string | null
  created: number
  currency: string | null
  line_items: CheckoutSessionLineItems | null
  metadata: Record<string, string>
  mode: string
  payment_intent: string | null
  payment_status: "no_payment_required" | "paid" | "unpaid"
  status: "complete" | "expired" | "open"
  success_url: string | null
  cancel_url: string | null
  shipping_address_collection: CheckoutSessionShippingAddressCollection | null
  shipping_details: CheckoutSessionShippingDetails | null
  customer_details: CheckoutSessionCustomerDetails | null
  url: string
}

export type CreateCheckoutSessionRequest = {
  client_reference_id?: string
  currency?: string
  line_items?: CheckoutSessionLineItems
  metadata?: StripeMetadata
  mode?: "payment" | "setup" | "subscription"
  success_url?: string
  cancel_url?: string
  shipping_address_collection?: CheckoutSessionShippingAddressCollection
}

export type CompleteCheckoutSessionOptions = {
  customer_details?: CheckoutSessionCustomerDetails
  shipping_details?: CheckoutSessionShippingDetails
}

export type RouteContext = {
  checkoutSessions: Map<string, CheckoutSession>
  createId(prefix: string): string
  getUrl(): string
}
