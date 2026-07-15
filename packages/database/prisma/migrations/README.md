# Production migration runbook

Existing production databases already contain the baseline schema. Before enabling
Railway `preDeployCommand` for the first time:

1. Enter a maintenance window and stop API writes.
2. Run `npm run db:backup` with `DIRECT_URL` (port 5432).
3. Run `npm run db:invariants:snapshot` and retain the emitted JSON path.
4. Verify the backup with `pg_restore --list <dump>`.
5. Mark only the baseline as applied:
   `npx prisma migrate resolve --applied 20260715000100_baseline --schema packages/database/prisma/schema.prisma`.
6. Run `npm run db:migrate:deploy`.
7. Run `npm run db:invariants:verify -- <snapshot-file>`.
8. Deploy API and worker services, then run smoke and load tests.

Fresh databases must not use `migrate resolve`; `migrate deploy` creates the
baseline and applies every additive migration. Use the adjacent `rollback.sql`
only during the maintenance window and keep additive data for forensic recovery.
