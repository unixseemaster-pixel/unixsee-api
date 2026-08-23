-- Persist optional client idempotency keys for ticket message retries.
ALTER TABLE "ticket_messages"
  ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "ticket_messages_ticket_id_idempotency_key_key"
  ON "ticket_messages" ("ticket_id", "idempotency_key");
