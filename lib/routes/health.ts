import { jsonResponse } from "../utils.js"

export function getHealthRoute(): Response {
  return jsonResponse({ ok: true })
}
