import { getDb } from '../db/db.js';

const CANONICAL_FIELD_PATTERNS = {
  contacts: {
    display_name: ['party name', 'customer name', 'vendor name', 'party_name', 'party', 'partyname', 'name', 'voucherpartyname', 'partyledgername', 'company_name'],
    gstin: ['gst no', 'gstin', 'gst_number', 'gstin_uin', 'tax_id', 'gstnumber', 'vatnumber', 'partygstin'],
    pan: ['pan', 'pan no', 'pan_number', 'itpan', 'panno'],
    phone: ['phone', 'mobile', 'telephone', 'contact_no', 'phone_number'],
    email: ['email', 'email address', 'email_id', 'mail']
  },
  invoices: {
    doc_number: ['invoice no', 'invoice_no', 'invoice_number', 'bill_no', 'vouchernumber', 'doc_num', 'reference', 'ref_no', 'inv_no'],
    txn_date: ['invoice date', 'date', 'voucherdate', 'bill_date', 'created_date', 'txn_date', 'dated'],
    total_amount: ['total', 'amount', 'grand total', 'vouchertotal', 'net_amount', 'amount_paise', 'invoice_totals', 'paidamount'],
    contact_name: ['party name', 'customer name', 'party', 'partyname', 'customer', 'partyledgername', 'client']
  },
  bills: {
    doc_number: ['bill no', 'bill_number', 'invoice no', 'vouchernumber', 'vendor_invoice_no', 'reference'],
    txn_date: ['bill date', 'date', 'voucherdate', 'txn_date', 'dated'],
    total_amount: ['total', 'amount', 'bill_amount', 'vouchertotal', 'net_amount', 'amount_paise'],
    contact_name: ['party name', 'vendor name', 'vendor', 'partyledgername', 'supplier']
  },
  chart_of_accounts: {
    name: ['ledger', 'ledger name', 'account name', 'expense head', 'ledgername', 'account_title'],
    account_type: ['type', 'group', 'account_type', 'parent', 'ledger_group', 'under']
  }
};

/**
 * Automatically discovers columns from raw rows and maps them to canonical Meso fields.
 */
export function autoDiscoverSchemaMapping({ rows = [], targetEntity = 'contacts', sourceSystem = 'CUSTOM' }) {
  if (rows.length === 0) {
    return { targetEntity, sourceSystem, mappings: {} };
  }

  const sampleRow = rows[0];
  const sourceColumns = Object.keys(sampleRow);
  const patterns = CANONICAL_FIELD_PATTERNS[targetEntity] || CANONICAL_FIELD_PATTERNS.contacts;
  const mappings = {};

  for (const [canonicalField, aliases] of Object.entries(patterns)) {
    for (const col of sourceColumns) {
      const cleanCol = col.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
      const directMatch = aliases.some(alias => cleanCol === alias || cleanCol.includes(alias));

      if (directMatch && !Object.values(mappings).includes(col)) {
        mappings[canonicalField] = col;
        break;
      }
    }
  }

  return {
    targetEntity,
    sourceSystem,
    mappings
  };
}

/**
 * Saves a reusable mapping template for future automated imports.
 */
export async function saveSchemaMappingTemplate({
  companyId = 'comp_1',
  name,
  sourceSystem = 'CUSTOM',
  targetEntity = 'contacts',
  columnMappings = {}
}) {
  const db = await getDb();

  const res = await db.query(
    `INSERT INTO import_schema_mappings (
      company_id, name, source_system, target_entity, column_mappings
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [companyId, name, sourceSystem, targetEntity, JSON.stringify(columnMappings)]
  );

  return res.rows[0];
}

/**
 * Transforms a raw row into a clean, canonical object using the schema mapping.
 */
export function transformRowWithMapping(rawRow, mappings = {}) {
  const clean = {};
  for (const [canonicalKey, sourceCol] of Object.entries(mappings)) {
    if (sourceCol && rawRow[sourceCol] !== undefined) {
      clean[canonicalKey] = rawRow[sourceCol];
    }
  }
  return clean;
}
