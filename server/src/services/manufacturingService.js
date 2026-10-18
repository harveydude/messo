/**
 * Meso Phase 38: Bill of Materials (BOM), Assemblies & Job Work (ITC-04)
 * Multi-component manufacturing, finished goods assembly builds, and Indian GST Job Work compliance.
 */

import { getDb } from '../db/db.js';
import { recordInventoryIssue, recordInventoryReceipt } from './inventoryValuationService.js';

/**
 * Define a new Bill of Materials (BOM) recipe
 */
export async function createBillOfMaterials({
  companyId = 'comp_1',
  finishedProductId,
  bomNumber,
  name,
  version = '1.0',
  notes = '',
  components = [] // array of { componentProductId, quantityPerUnit, scrapPercentage }
}) {
  const db = await getDb();

  const bomRes = await db.query(
    `INSERT INTO bill_of_materials 
     (company_id, finished_product_id, bom_number, name, version, is_active, notes)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6)
     RETURNING *`,
    [companyId, finishedProductId, bomNumber, name, version, notes]
  );
  const bom = bomRes.rows[0];

  const insertedComponents = [];
  for (const c of components) {
    const cRes = await db.query(
      `INSERT INTO bom_components 
       (bom_id, component_product_id, quantity_per_unit, scrap_percentage, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [bom.id, c.componentProductId, parseFloat(c.quantityPerUnit), parseFloat(c.scrapPercentage || 0), c.notes || '']
    );
    insertedComponents.push(cRes.rows[0]);
  }

  return {
    ...bom,
    components: insertedComponents
  };
}

/**
 * Execute an Assembly Build / Production Run
 * Consumes component inventory according to BOM recipe and creates finished product stock.
 */
export async function executeAssemblyBuild({
  companyId = 'comp_1',
  bomId,
  buildNumber,
  buildDate = new Date().toISOString().split('T')[0],
  quantityAssembled = 1,
  notes = ''
}) {
  const db = await getDb();
  const qty = parseFloat(quantityAssembled);

  // Retrieve BOM details and components
  const bomRes = await db.query(`SELECT * FROM bill_of_materials WHERE id = $1 AND company_id = $2`, [bomId, companyId]);
  if (!bomRes.rows[0]) throw new Error(`BOM ${bomId} not found`);
  const bom = bomRes.rows[0];

  const compsRes = await db.query(`SELECT * FROM bom_components WHERE bom_id = $1`, [bomId]);
  const components = compsRes.rows;

  let totalComponentCostPaise = 0;
  const consumedLines = [];

  // Deplete raw material components
  for (const c of components) {
    const scrapFactor = 1 + (parseFloat(c.scrap_percentage || 0) / 100);
    const requiredQty = parseFloat(c.quantity_per_unit) * qty * scrapFactor;

    // Issue component from inventory
    const issueResult = await recordInventoryIssue({
      companyId,
      productId: c.component_product_id,
      quantity: requiredQty,
      sourceDocType: 'ASSEMBLY_BUILD',
      sourceDocId: buildNumber,
      layerDate: buildDate
    });

    totalComponentCostPaise += issueResult.totalCogsPaise;
    consumedLines.push({
      componentProductId: c.component_product_id,
      quantityConsumed: requiredQty,
      costPaise: issueResult.totalCogsPaise
    });
  }

  // Create finished goods inventory layer
  const unitFinishedCostPaise = qty > 0 ? Math.round(totalComponentCostPaise / qty) : 0;
  await recordInventoryReceipt({
    companyId,
    productId: bom.finished_product_id,
    quantity: qty,
    unitCostPaise: unitFinishedCostPaise,
    sourceDocType: 'ASSEMBLY_BUILD',
    sourceDocId: buildNumber,
    layerDate: buildDate
  });

  // Post balanced Double-Entry Manufacturing Journal Entry
  // Debit: Finished Goods Inventory, Credit: Raw Materials Inventory
  const jeId = 'je_asm_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const entryNumber = 'JE-ASM-' + Date.now();
  await db.query(
    `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, source_id, status)
     VALUES ($1, $2, $3, $4, $5, 'ASSEMBLY_BUILD', $6, 'POSTED')`,
    [jeId, companyId, entryNumber, buildDate, `Production assembly build ${buildNumber} for ${bom.name}`, buildNumber]
  );

  const l1Id = 'jel_asm_' + Date.now() + '_1';
  const l2Id = 'jel_asm_' + Date.now() + '_2';

  await db.query(
    `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
     VALUES ($1, $2, 'acc_finished_goods_inventory', $3, 0, 'Manufactured finished goods capitalised into inventory'),
            ($4, $2, 'acc_raw_materials_inventory', 0, $3, 'Raw materials consumed in production')`,
    [l1Id, jeId, totalComponentCostPaise, l2Id]
  );

  // Record assembly build document
  const buildRes = await db.query(
    `INSERT INTO assembly_builds 
     (company_id, bom_id, build_number, build_date, quantity_assembled, total_cost_paise, status, journal_entry_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8)
     RETURNING *`,
    [companyId, bomId, buildNumber, buildDate, qty, totalComponentCostPaise, jeId, notes]
  );

  return {
    ...buildRes.rows[0],
    consumedLines,
    finishedProductId: bom.finished_product_id,
    unitCostPaise: unitFinishedCostPaise
  };
}

/**
 * Issue a statutory Job Work Delivery Challan (CGST Section 143 & Form ITC-04)
 */
export async function issueJobWorkChallan({
  companyId = 'comp_1',
  challanNumber,
  challanDate = new Date().toISOString().split('T')[0],
  jobWorkerId,
  goodsType = 'INPUTS', // 'INPUTS' (1-year limit) or 'CAPITAL_GOODS' (3-year limit)
  items = [], // array of { productId, description, quantitySent, natureOfProcessing }
  notes = ''
}) {
  const db = await getDb();

  // Statutory deadline: 1 year for inputs, 3 years for capital goods under Section 143
  const dueMonths = goodsType === 'CAPITAL_GOODS' ? 36 : 12;
  const d = new Date(challanDate);
  d.setMonth(d.getMonth() + dueMonths);
  const dueReturnDate = d.toISOString().split('T')[0];

  const challanRes = await db.query(
    `INSERT INTO job_work_challans 
     (company_id, challan_number, challan_date, job_worker_id, goods_type, due_return_date, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, 'ISSUED', $7)
     RETURNING *`,
    [companyId, challanNumber, challanDate, jobWorkerId, goodsType, dueReturnDate, notes]
  );
  const challan = challanRes.rows[0];

  const insertedItems = [];
  for (const item of items) {
    const iRes = await db.query(
      `INSERT INTO job_work_challan_items 
       (challan_id, product_id, description, quantity_sent, quantity_returned, nature_of_processing)
       VALUES ($1, $2, $3, $4, 0, $5)
       RETURNING *`,
      [challan.id, item.productId, item.description, parseFloat(item.quantitySent), item.natureOfProcessing || 'Processing']
    );
    insertedItems.push(iRes.rows[0]);
  }

  return {
    ...challan,
    items: insertedItems
  };
}

/**
 * Record receipt of processed goods back from job worker
 */
export async function recordJobWorkReturn({
  companyId = 'comp_1',
  challanId,
  returnDate = new Date().toISOString().split('T')[0],
  returns = [] // array of { itemId, quantityReturned }
}) {
  const db = await getDb();

  for (const ret of returns) {
    await db.query(
      `UPDATE job_work_challan_items 
       SET quantity_returned = quantity_returned + $1 
       WHERE id = $2 AND challan_id = $3`,
      [parseFloat(ret.quantityReturned), ret.itemId, challanId]
    );
  }

  // Check if fully returned
  const itemsRes = await db.query(`SELECT quantity_sent, quantity_returned FROM job_work_challan_items WHERE challan_id = $1`, [challanId]);
  const isFullyReturned = itemsRes.rows.every(r => parseFloat(r.quantity_returned) >= parseFloat(r.quantity_sent));

  const newStatus = isFullyReturned ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED';
  await db.query(`UPDATE job_work_challans SET status = $1 WHERE id = $2 AND company_id = $3`, [newStatus, challanId, companyId]);

  return {
    challanId,
    status: newStatus,
    isFullyReturned
  };
}

/**
 * Check for overdue Job Work challans that breach Section 143 return deadlines
 * Triggers statutory Deemed Supply tax liability warning if past 1/3 years.
 */
export async function checkOverdueJobWorkChallans(companyId = 'comp_1') {
  const db = await getDb();
  const res = await db.query(
    `SELECT 
       j.*, c.display_name AS job_worker_name, c.gstin AS job_worker_gstin,
       (CURRENT_DATE - j.due_return_date) AS days_overdue
     FROM job_work_challans j
     JOIN contacts c ON j.job_worker_id = c.id
     WHERE j.company_id = $1 
       AND j.status IN ('ISSUED', 'PARTIALLY_RETURNED')
       AND j.due_return_date < CURRENT_DATE
     ORDER BY j.due_return_date ASC`,
    [companyId]
  );
  return res.rows;
}
