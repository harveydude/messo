-- ============ 012: Domain 8 - Inventory, Manufacturing & Project Profitability (Phases 36-40) ============

-- 1. Phase 36: Continuous Inventory Valuation Engine (FIFO & Weighted Average)
CREATE TABLE IF NOT EXISTS inventory_valuation_layers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  product_id          TEXT NOT NULL,
  layer_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  layer_type          TEXT NOT NULL CHECK (layer_type IN ('PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'ASSEMBLY_IN', 'ASSEMBLY_OUT')),
  source_doc_type     TEXT NOT NULL DEFAULT 'BILL',
  source_doc_id       TEXT,
  quantity_in         NUMERIC(12, 4) NOT NULL DEFAULT 0,
  quantity_out        NUMERIC(12, 4) NOT NULL DEFAULT 0,
  quantity_remaining  NUMERIC(12, 4) NOT NULL DEFAULT 0,
  unit_cost_paise     BIGINT NOT NULL DEFAULT 0,
  total_cost_paise    BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_val_layers_prod ON inventory_valuation_layers (company_id, product_id, layer_date, created_at);

-- 2. Phase 37: Batch/Serial Tracking, Reorder Alerts & Stock Adjustments
CREATE TABLE IF NOT EXISTS inventory_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  product_id          TEXT NOT NULL,
  batch_number        TEXT NOT NULL,
  mfg_date            DATE,
  expiry_date         DATE,
  initial_quantity    NUMERIC(12, 4) NOT NULL DEFAULT 0,
  current_quantity    NUMERIC(12, 4) NOT NULL DEFAULT 0,
  unit_cost_paise     BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, product_id, batch_number)
);
CREATE INDEX IF NOT EXISTS idx_batch_expiry ON inventory_batches (company_id, product_id, expiry_date);

CREATE TABLE IF NOT EXISTS inventory_serials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  product_id          TEXT NOT NULL,
  batch_id            UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
  serial_number       TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'SOLD', 'DEFECTIVE', 'RETURNED')),
  purchase_doc_id     TEXT,
  sales_doc_id        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, product_id, serial_number)
);
CREATE INDEX IF NOT EXISTS idx_serial_status ON inventory_serials (company_id, product_id, status);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  adjustment_number   TEXT NOT NULL,
  adjustment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  reason              TEXT NOT NULL CHECK (reason IN ('SHRINKAGE', 'DAMAGE', 'SURPLUS', 'REVALUATION', 'PHYSICAL_COUNT')),
  status              TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'VOIDED')),
  total_variance_paise BIGINT NOT NULL DEFAULT 0,
  journal_entry_id    TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, adjustment_number)
);
CREATE INDEX IF NOT EXISTS idx_stock_adj ON stock_adjustments (company_id, adjustment_date);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id       UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id          TEXT NOT NULL,
  system_quantity     NUMERIC(12, 4) NOT NULL DEFAULT 0,
  counted_quantity    NUMERIC(12, 4) NOT NULL DEFAULT 0,
  variance_quantity   NUMERIC(12, 4) NOT NULL DEFAULT 0,
  unit_cost_paise     BIGINT NOT NULL DEFAULT 0,
  variance_cost_paise BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_stock_adj_items ON stock_adjustment_items (adjustment_id);

-- Alter products_and_services to ensure reorder points and tracking flags exist
ALTER TABLE products_and_services ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(12, 4) DEFAULT 10;
ALTER TABLE products_and_services ADD COLUMN IF NOT EXISTS preferred_vendor_id TEXT;
ALTER TABLE products_and_services ADD COLUMN IF NOT EXISTS is_batch_tracked BOOLEAN DEFAULT FALSE;
ALTER TABLE products_and_services ADD COLUMN IF NOT EXISTS is_serial_tracked BOOLEAN DEFAULT FALSE;
ALTER TABLE products_and_services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Phase 38: Bill of Materials (BOM), Assemblies & Job Work (ITC-04)
CREATE TABLE IF NOT EXISTS bill_of_materials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  finished_product_id TEXT NOT NULL,
  bom_number          TEXT NOT NULL,
  name                TEXT NOT NULL,
  version             TEXT NOT NULL DEFAULT '1.0',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, bom_number)
);
CREATE INDEX IF NOT EXISTS idx_bom_finished ON bill_of_materials (company_id, finished_product_id);

CREATE TABLE IF NOT EXISTS bom_components (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id              UUID NOT NULL REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  component_product_id TEXT NOT NULL,
  quantity_per_unit   NUMERIC(12, 4) NOT NULL DEFAULT 1,
  scrap_percentage    NUMERIC(5, 2) NOT NULL DEFAULT 0,
  notes               TEXT
);
CREATE INDEX IF NOT EXISTS idx_bom_comp ON bom_components (bom_id);

CREATE TABLE IF NOT EXISTS assembly_builds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  bom_id              UUID NOT NULL REFERENCES bill_of_materials(id),
  build_number        TEXT NOT NULL,
  build_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_assembled  NUMERIC(12, 4) NOT NULL DEFAULT 1,
  total_cost_paise    BIGINT NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('DRAFT', 'COMPLETED', 'CANCELLED')),
  journal_entry_id    TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, build_number)
);
CREATE INDEX IF NOT EXISTS idx_assembly_builds ON assembly_builds (company_id, build_date);

CREATE TABLE IF NOT EXISTS job_work_challans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  challan_number      TEXT NOT NULL,
  challan_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  job_worker_id       TEXT NOT NULL,
  goods_type          TEXT NOT NULL DEFAULT 'INPUTS' CHECK (goods_type IN ('INPUTS', 'CAPITAL_GOODS')),
  due_return_date     DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED', 'DEEMED_SUPPLY')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, challan_number)
);
CREATE INDEX IF NOT EXISTS idx_jw_challan ON job_work_challans (company_id, due_return_date, status);

CREATE TABLE IF NOT EXISTS job_work_challan_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_id          UUID NOT NULL REFERENCES job_work_challans(id) ON DELETE CASCADE,
  product_id          TEXT NOT NULL,
  description         TEXT NOT NULL,
  quantity_sent       NUMERIC(12, 4) NOT NULL,
  quantity_returned   NUMERIC(12, 4) NOT NULL DEFAULT 0,
  nature_of_processing TEXT DEFAULT 'Job work finishing'
);
CREATE INDEX IF NOT EXISTS idx_jw_items ON job_work_challan_items (challan_id);

-- 4. Phase 39: Timesheets, Contractor Hours & Billable Expenses
-- Update existing projects table from schema.sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                TEXT NOT NULL DEFAULT 'comp_1',
  project_id                TEXT REFERENCES projects(id) ON DELETE SET NULL,
  customer_id               TEXT,
  worker_id                 TEXT NOT NULL,
  worker_name               TEXT NOT NULL,
  work_date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  hours                     NUMERIC(6, 2) NOT NULL DEFAULT 1,
  hourly_cost_paise         BIGINT NOT NULL DEFAULT 0,
  hourly_billable_rate_paise BIGINT NOT NULL DEFAULT 0,
  is_billable               BOOLEAN NOT NULL DEFAULT TRUE,
  status                    TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'APPROVED', 'BILLED', 'REJECTED')),
  invoice_id                TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timesheets_proj ON timesheet_entries (company_id, project_id, status, is_billable);

CREATE TABLE IF NOT EXISTS billable_expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  project_id          TEXT REFERENCES projects(id) ON DELETE SET NULL,
  customer_id         TEXT,
  vendor_id           TEXT,
  source_doc_type     TEXT DEFAULT 'BILL',
  source_doc_id       TEXT,
  description         TEXT NOT NULL,
  amount_paise        BIGINT NOT NULL DEFAULT 0,
  markup_percentage   NUMERIC(5, 2) NOT NULL DEFAULT 0,
  billable_amount_paise BIGINT NOT NULL DEFAULT 0,
  is_billable         BOOLEAN NOT NULL DEFAULT TRUE,
  status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'BILLED')),
  invoice_id          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billable_exp ON billable_expenses (company_id, project_id, status);
