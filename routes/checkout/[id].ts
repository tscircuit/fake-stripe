import { hostedCheckoutPage } from "../../lib/checkout-sessions"
import { withRouteSpec } from "../../lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  routeParams: z.object({
    id: z.string(),
  }),
})((req, ctx) => {
  return hostedCheckoutPage(ctx.db, req.routeParams.id)
})
