import { createCheckoutSession } from "../../../lib/checkout-sessions"
import { checkoutSessionSchema } from "../../../lib/db/schema"
import { withRouteSpec } from "../../../lib/middleware/with-winter-spec"

export default withRouteSpec({
  methods: ["POST"],
  jsonResponse: checkoutSessionSchema,
})(async (req, ctx) => {
  const result = await createCheckoutSession(ctx.db, req)
  return result instanceof Response ? result : ctx.json(result)
})
