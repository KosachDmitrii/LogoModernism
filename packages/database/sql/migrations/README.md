# Production migration runbook

Existing production databases already contain the baseline schema. Before enabling
Railway `preDeployCommand` for the first time:

1. Enter a maintenance window and stop API writes.
2. Run `npm run db:backup` with `DIRECT_URL` (port 5432).
3. Run `npm run db:invariants:snapshot` and retain the emitted JSON path.
4. Verify the backup with `pg_restore --list <dump>`.
5. Run `npm run db:migrate:status`. The SQL runner imports successful
   `_prisma_migrations` history automatically on existing databases.
6. Run `npm run db:migrate:deploy`.
7. Run `npm run db:invariants:verify -- <snapshot-file>`.
8. Deploy the API service, then run smoke and load tests.

Fresh databases use the same command; the SQL runner creates the baseline and
applies every additive migration. Use the adjacent `rollback.sql`
only during the maintenance window and keep additive data for forensic recovery.
