import { createStore } from "zustand/vanilla"
import { combine } from "zustand/middleware"
import { hoist } from "zustand-hoist"

import {
  type CheckoutSession,
  databaseSchema,
  type DatabaseSchema,
} from "./schema"

export const createDatabase = () => {
  return hoist(createStore(initializer))
}

export type DbClient = ReturnType<typeof createDatabase>

const initializer = combine(databaseSchema.parse({}), (set, get) => ({
  createId: (prefix: string) => {
    const idCounter = get().idCounter
    set({ idCounter: idCounter + 1 })
    return `${prefix}_${idCounter}`
  },
  getCheckoutSession: (id: string) => {
    return get().checkoutSessions.find((session) => session.id === id)
  },
  setCheckoutSession: (session: CheckoutSession) => {
    set((state: DatabaseSchema) => ({
      checkoutSessions: [
        ...state.checkoutSessions.filter(({ id }) => id !== session.id),
        session,
      ],
    }))
  },
  getCheckoutSessionsMap: () => {
    return new Map(
      get().checkoutSessions.map((session) => [session.id, session] as const),
    )
  },
  clearCheckoutSessions: () => {
    set({ checkoutSessions: [] })
  },
}))
