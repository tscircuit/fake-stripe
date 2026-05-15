import { createWithWinterSpec } from "winterspec"
import { withDb } from "./with-db"
import { withStripeCors } from "./with-stripe-cors"
import { withStripeErrors } from "./with-stripe-errors"

export const withRouteSpec = createWithWinterSpec({
  openapi: {
    apiName: "fake-stripe",
    productionServerUrl: "https://api.stripe.com",
  },
  authMiddleware: {},
  beforeAuthMiddleware: [],
  afterAuthMiddleware: [withStripeCors, withStripeErrors, withDb],
})
