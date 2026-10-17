/**
 * Multi-GSTIN Branches, Cost Centers & Classes Service (Phase 14)
 * Allows a single legal entity to operate multiple state GSTIN branches and cost centers.
 */

import { getDb } from '../db/db.js';
import { validateGstin } from './stagingDoctor.js';

export async function createBranch({
  companyId = 'comp_1',
  branchCode,
  branchName,
  gstin,
  stateCode,
  stateName,
  address = '',
  isHeadOffice = false
}) {
  const db = await getDb();
  const cleanGstin = String(gstin || '').trim().toUpperCase();

  const gstinCheck = validateGstin(cleanGstin);
  if (!gstinCheck.valid) {
    throw new Error(`Invalid branch GSTIN: ${cleanGstin}. ${gstinCheck.reason}`);
  }

  // Ensure 2-digit state code matches first 2 chars of GSTIN
  const gstinPrefix = cleanGstin.substring(0, 2);
  const normalizedStateCode = String(stateCode || gstinPrefix).padStart(2, '0');

  if (gstinPrefix !== normalizedStateCode) {
    throw new Error(`Branch state code (${normalizedStateCode}) does not match GSTIN prefix (${gstinPrefix})`);
  }

  const query = `
    INSERT INTO company_branches (
      company_id, branch_code, branch_name, gstin, state_code, state_name, address, is_head_office
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (company_id, branch_code)
    DO UPDATE SET branch_name = EXCLUDED.branch_name, gstin = EXCLUDED.gstin, state_name = EXCLUDED.state_name
    RETURNING *;
  `;

  const res = await db.query(query, [
    companyId,
    branchCode.toUpperCase(),
    branchName,
    cleanGstin,
    normalizedStateCode,
    stateName || 'State ' + normalizedStateCode,
    address,
    isHeadOffice
  ]);

  return res.rows[0];
}

export async function listBranches({ companyId = 'comp_1' }) {
  const db = await getDb();
  const res = await db.query(
    `SELECT * FROM company_branches WHERE company_id = $1 AND is_active = true ORDER BY is_head_office DESC, branch_code ASC`,
    [companyId]
  );
  return res.rows || [];
}

export async function createCostCenter({
  companyId = 'comp_1',
  code,
  name,
  department = 'Operations'
}) {
  const db = await getDb();
  const cleanCode = String(code || '').trim().toUpperCase();

  const query = `
    INSERT INTO cost_centers (
      company_id, code, name, department
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (company_id, code)
    DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department
    RETURNING *;
  `;

  const res = await db.query(query, [companyId, cleanCode, name, department]);
  return res.rows[0];
}

export async function listCostCenters({ companyId = 'comp_1' }) {
  const db = await getDb();
  const res = await db.query(
    `SELECT * FROM cost_centers WHERE company_id = $1 AND is_active = true ORDER BY code ASC`,
    [companyId]
  );
  return res.rows || [];
}
