import { jsonResponse } from "../utils"

export function getHealthRoute(): Response {
  return jsonResponse({ ok: true })
}
