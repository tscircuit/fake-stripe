import { completeHostedCheckout } from "../../../lib/checkout-sessions"
import { checkoutSessionSchema } from "../../../lib/db/schema"
import { withRouteSpec } from "../../../lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["POST"],
  routeParams: z.object({
    id: z.string(),
  }),
  jsonResponse: checkoutSessionSchema,
})(async (req, ctx) => {
  const result = await completeHostedCheckout(ctx.db, req, req.routeParams.id)
  return result instanceof Response ? result : ctx.json(result)
})
