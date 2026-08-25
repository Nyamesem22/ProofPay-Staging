BEGIN;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS agreement_type varchar(40) NOT NULL DEFAULT 'Goods delivery',
  ADD COLUMN IF NOT EXISTS agreement_statement text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS automatic_agreement_confirmation boolean NOT NULL DEFAULT true;

COMMIT;
