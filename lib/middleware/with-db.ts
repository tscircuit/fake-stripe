import { createDatabase, type DbClient } from "lib/db/db-client"
import type { Middleware } from "winterspec"

const defaultDb = createDatabase()

export const withDb: Middleware<
  {},
  {
    db: DbClient
  }
> = async (req, ctx, next) => {
  if (!ctx.db) {
    ctx.db = defaultDb
  }

  return next(req, ctx)
}
