CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

COMMENT ON TABLE outbox_events IS
  'Transactional handoff from bounded API writes to BullMQ workers.';
COMMENT ON COLUMN outbox_events.available_at IS
  'Next delivery time; while processing this is also the lease expiration.';
