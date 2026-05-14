import { handleRoute } from "../lib/routes"
import type { CheckoutSession, RouteContext } from "../lib/types"

const checkoutSessions = new Map<string, CheckoutSession>()
let nextId = 1

function getRequestOrigin(request: Request): string {
  const url = new URL(request.url)
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto")

  if (forwardedHost != null) {
    return `${forwardedProto ?? url.protocol.replace(":", "")}://${forwardedHost}`
  }

  return url.origin
}

function getOriginalRequest(request: Request): Request {
  const url = new URL(request.url)
  const originalPath = url.searchParams.get("path")

  if (originalPath == null) {
    return request
  }

  url.pathname = originalPath === "" ? "/" : `/${originalPath}`
  url.searchParams.delete("path")

  return new Request(url.toString(), request)
}

export default {
  fetch(request: Request): Promise<Response> {
    const originalRequest = getOriginalRequest(request)
    const context: RouteContext = {
      checkoutSessions,
      createId(prefix: string) {
        return `${prefix}_${nextId++}`
      },
      getUrl() {
        return getRequestOrigin(originalRequest)
      },
    }

    return handleRoute(context, originalRequest)
  },
}
