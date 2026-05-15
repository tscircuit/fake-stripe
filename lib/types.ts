export type {
  CheckoutSession,
  CheckoutSessionCustomerDetails,
  CheckoutSessionLineItem,
  CheckoutSessionLineItems,
  CheckoutSessionPriceData,
  CheckoutSessionProductData,
  CheckoutSessionShippingAddressCollection,
  CheckoutSessionShippingDetails,
  CreateCheckoutSessionRequest,
  StripeAddress,
  StripeMetadata,
} from "./db/schema"

export type StripeServerOptions = {
  hostname?: string
  port?: number
}

export type CompleteCheckoutSessionOptions = {
  customer_details?: import("./db/schema").CheckoutSessionCustomerDetails
  shipping_details?: import("./db/schema").CheckoutSessionShippingDetails
}
