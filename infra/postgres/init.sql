-- Run once when the postgres container is first initialized.
-- Enables extensions needed across all migrations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
