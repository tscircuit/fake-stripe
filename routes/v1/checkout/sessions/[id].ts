import { retrieveCheckoutSession } from "../../../../lib/checkout-sessions"
import { checkoutSessionSchema } from "../../../../lib/db/schema"
import { withRouteSpec } from "../../../../lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  routeParams: z.object({
    id: z.string(),
  }),
  jsonResponse: checkoutSessionSchema,
})((req, ctx) => {
  const result = retrieveCheckoutSession(ctx.db, req.routeParams.id)
  return result instanceof Response ? result : ctx.json(result)
})
