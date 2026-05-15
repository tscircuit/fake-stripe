import { z } from "zod"

export const stripeMetadataSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
)
export type StripeMetadata = z.infer<typeof stripeMetadataSchema>

export const stripeAddressSchema = z.object({
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  line1: z.string().nullable().optional(),
  line2: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
})
export type StripeAddress = z.infer<typeof stripeAddressSchema>

export const checkoutSessionShippingAddressCollectionSchema = z.object({
  allowed_countries: z.union([z.array(z.string()), z.record(z.string())]),
})
export type CheckoutSessionShippingAddressCollection = z.infer<
  typeof checkoutSessionShippingAddressCollectionSchema
>

export const checkoutSessionProductDataSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  metadata: stripeMetadataSchema.optional(),
})
export type CheckoutSessionProductData = z.infer<
  typeof checkoutSessionProductDataSchema
>

export const checkoutSessionPriceDataSchema = z.object({
  currency: z.string(),
  unit_amount: z.union([z.number(), z.string()]).optional(),
  unit_amount_decimal: z.string().optional(),
  product_data: checkoutSessionProductDataSchema.optional(),
})
export type CheckoutSessionPriceData = z.infer<
  typeof checkoutSessionPriceDataSchema
>

export const checkoutSessionLineItemSchema = z.object({
  price: z.string().optional(),
  price_data: checkoutSessionPriceDataSchema.optional(),
  quantity: z.union([z.number(), z.string()]).optional(),
  metadata: stripeMetadataSchema.optional(),
})
export type CheckoutSessionLineItem = z.infer<
  typeof checkoutSessionLineItemSchema
>

export const checkoutSessionLineItemsSchema = z.union([
  z.array(checkoutSessionLineItemSchema),
  z.record(checkoutSessionLineItemSchema),
])
export type CheckoutSessionLineItems = z.infer<
  typeof checkoutSessionLineItemsSchema
>

export const checkoutSessionShippingDetailsSchema = z.object({
  address: stripeAddressSchema,
  name: z.string(),
})
export type CheckoutSessionShippingDetails = z.infer<
  typeof checkoutSessionShippingDetailsSchema
>

export const checkoutSessionCustomerDetailsSchema = z.object({
  address: stripeAddressSchema.nullable().optional(),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  tax_exempt: z.enum(["exempt", "none", "reverse"]).nullable().optional(),
})
export type CheckoutSessionCustomerDetails = z.infer<
  typeof checkoutSessionCustomerDetailsSchema
>

export const checkoutSessionSchema = z.object({
  id: z.string(),
  object: z.literal("checkout.session"),
  client_reference_id: z.string().nullable(),
  created: z.number(),
  currency: z.string().nullable(),
  line_items: checkoutSessionLineItemsSchema.nullable(),
  metadata: z.record(z.string()),
  mode: z.string(),
  payment_intent: z.string().nullable(),
  payment_status: z.enum(["no_payment_required", "paid", "unpaid"]),
  status: z.enum(["complete", "expired", "open"]),
  success_url: z.string().nullable(),
  cancel_url: z.string().nullable(),
  shipping_address_collection:
    checkoutSessionShippingAddressCollectionSchema.nullable(),
  shipping_details: checkoutSessionShippingDetailsSchema.nullable(),
  customer_details: checkoutSessionCustomerDetailsSchema.nullable(),
  url: z.string(),
})
export type CheckoutSession = z.infer<typeof checkoutSessionSchema>

export const createCheckoutSessionRequestSchema = z.object({
  client_reference_id: z.string().optional(),
  currency: z.string().optional(),
  line_items: checkoutSessionLineItemsSchema.optional(),
  metadata: stripeMetadataSchema.optional(),
  mode: z.enum(["payment", "setup", "subscription"]).optional(),
  success_url: z.string().optional(),
  cancel_url: z.string().optional(),
  shipping_address_collection:
    checkoutSessionShippingAddressCollectionSchema.optional(),
})
export type CreateCheckoutSessionRequest = z.infer<
  typeof createCheckoutSessionRequestSchema
>

export const databaseSchema = z.object({
  idCounter: z.number().default(1),
  checkoutSessions: z.array(checkoutSessionSchema).default([]),
})
export type DatabaseSchema = z.infer<typeof databaseSchema>
