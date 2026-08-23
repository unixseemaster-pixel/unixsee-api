-- Must commit before SUBMITTED can be used in DML (Postgres enum ADD VALUE rule).
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
