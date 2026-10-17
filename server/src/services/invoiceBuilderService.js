/**
 * Meso Phase 27: Multi-Template Tax Invoice, Bill of Supply & Export Invoice Builder
 * Dynamic template engine adapting to Regular GST, Composition, SEZ/LUT, and GIFT City IFSC.
 */

import { getDb } from '../db/db.js';
import { getCompanyPolicy } from './policyService.js';

export const TEMPLATE_TYPES = {
  TAX_INVOICE: 'TAX_INVOICE',
  BILL_OF_SUPPLY: 'BILL_OF_SUPPLY',
  EXPORT_INVOICE: 'EXPORT_INVOICE',
  IFSC_INVOICE: 'IFSC_INVOICE'
};

export const STATUTORY_DECLARATIONS = {
  TAX_INVOICE: 'Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged.',
  BILL_OF_SUPPLY: 'Composition taxable person, not eligible to collect tax on supplies.',
  EXPORT_INVOICE: 'Supply meant for export / SEZ under Letter of Undertaking without payment of integrated tax.',
  IFSC_INVOICE: 'Supplies made to a unit in an International Financial Services Centre under Section 80LA of the Income Tax Act, 1961.'
};

export async function createInvoiceTemplate({
  companyId = 'comp_1',
  templateName,
  templateType = TEMPLATE_TYPES.TAX_INVOICE,
  headerTitle,
  declarationText,
  bankDetails = {},
  accentColor = '#2CA01C',
  showHsn = true,
  showQrCode = true,
  showLutDetails = false,
  isDefault = false
}) {
  const db = await getDb();
  const name = templateName || `${templateType}_STANDARD`;
  const title = headerTitle || (templateType === 'BILL_OF_SUPPLY' ? 'BILL OF SUPPLY' : templateType === 'EXPORT_INVOICE' ? 'EXPORT INVOICE UNDER LUT' : templateType === 'IFSC_INVOICE' ? 'IFSC EXEMPT INVOICE' : 'TAX INVOICE');
  const declaration = declarationText || STATUTORY_DECLARATIONS[templateType] || STATUTORY_DECLARATIONS.TAX_INVOICE;

  if (isDefault) {
    await db.query(`UPDATE invoice_templates SET is_default = false WHERE company_id = $1`, [companyId]);
  }

  const query = `
    INSERT INTO invoice_templates (
      company_id, template_name, template_type, header_title, declaration_text,
      bank_details, accent_color, show_hsn, show_qr_code, show_lut_details, is_default
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (company_id, template_name) DO UPDATE SET
      header_title = EXCLUDED.header_title,
      declaration_text = EXCLUDED.declaration_text,
      bank_details = EXCLUDED.bank_details,
      accent_color = EXCLUDED.accent_color,
      show_hsn = EXCLUDED.show_hsn,
      show_qr_code = EXCLUDED.show_qr_code,
      show_lut_details = EXCLUDED.show_lut_details,
      is_default = EXCLUDED.is_default
    RETURNING *;
  `;

  const res = await db.query(query, [
    companyId,
    name,
    templateType,
    title,
    declaration,
    JSON.stringify(bankDetails),
    accentColor,
    showHsn,
    showQrCode,
    showLutDetails,
    isDefault
  ]);

  return res.rows[0];
}

export async function getTemplateForCompany(companyId = 'comp_1', forcedType = null) {
  const db = await getDb();
  const policy = await getCompanyPolicy(companyId);

  let targetType = forcedType;
  if (!targetType) {
    if (policy.registration_type === 'COMPOSITION' || policy.is_composition_scheme) {
      targetType = TEMPLATE_TYPES.BILL_OF_SUPPLY;
    } else if (policy.registration_type === 'GIFT_CITY_IFSC' || policy.is_gift_city_ifsc) {
      targetType = TEMPLATE_TYPES.IFSC_INVOICE;
    } else if (policy.registration_type === 'SEZ' || !!policy.lut_arn || policy.is_sez || policy.has_lut) {
      targetType = TEMPLATE_TYPES.EXPORT_INVOICE;
    } else {
      targetType = TEMPLATE_TYPES.TAX_INVOICE;
    }
  }

  const res = await db.query(
    `SELECT * FROM invoice_templates 
     WHERE company_id = $1 AND template_type = $2 
     ORDER BY is_default DESC, created_at DESC 
     LIMIT 1`,
    [companyId, targetType]
  );

  if (res.rows.length > 0) {
    return res.rows[0];
  }

  // Auto-generate standard template for this type
  return createInvoiceTemplate({
    companyId,
    templateName: `${targetType}_DEFAULT`,
    templateType: targetType,
    isDefault: true
  });
}

export async function renderInvoiceDocument({ companyId = 'comp_1', invoiceId, templateId = null }) {
  const db = await getDb();

  // 1. Fetch Invoice
  const invRes = await db.query(
    `SELECT i.*, c.display_name as customer_name, c.email as customer_email, 
            c.gstin as customer_gstin, c.pan as customer_pan, c.billing_address
     FROM invoices i
     LEFT JOIN contacts c ON c.id = i.customer_id
     WHERE i.id = $1 AND i.company_id = $2`,
    [invoiceId, companyId]
  );

  if (invRes.rows.length === 0) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }
  const invoice = invRes.rows[0];

  // 2. Fetch Template
  let template;
  if (templateId) {
    const tRes = await db.query(`SELECT * FROM invoice_templates WHERE id = $1 AND company_id = $2`, [templateId, companyId]);
    template = tRes.rows[0];
  }
  if (!template) {
    template = await getTemplateForCompany(companyId);
  }

  // 3. Fetch Company Policy & Profile
  const policy = await getCompanyPolicy(companyId);

  // 4. E-Invoice details if present
  const einvRes = await db.query(
    `SELECT irn_hash, ack_no, ack_date, signed_qr_code FROM e_invoices WHERE invoice_id = $1 AND status = 'ACTIVE' LIMIT 1`,
    [invoiceId]
  );
  const einvoice = einvRes.rows[0] || null;

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    template: {
      templateType: template.template_type,
      headerTitle: template.header_title,
      statutoryDeclaration: template.declaration_text,
      accentColor: template.accent_color,
      showHsn: template.show_hsn,
      showQrCode: template.show_qr_code && !!einvoice,
      bankDetails: template.bank_details
    },
    company: {
      companyId,
      legalName: policy.company_name || 'Meso Enterprise India Ltd',
      gstin: policy.gstin || '27AABCC1234F1ZH',
      lutArn: policy.lut_arn || null,
      isComposition: policy.registration_type === 'COMPOSITION' || !!policy.is_composition_scheme,
      isIfsc: policy.registration_type === 'GIFT_CITY_IFSC' || !!policy.is_gift_city_ifsc
    },
    customer: {
      id: invoice.customer_id,
      name: invoice.customer_name,
      gstin: invoice.customer_gstin,
      pan: invoice.customer_pan,
      billingAddress: invoice.billing_address
    },
    financials: {
      currency: invoice.currency || 'INR',
      subtotalPaise: invoice.subtotal_paise,
      taxPaise: invoice.tax_paise,
      cgstPaise: invoice.cgst_paise || 0,
      sgstPaise: invoice.sgst_paise || 0,
      igstPaise: invoice.igst_paise || 0,
      totalPaise: invoice.total_paise,
      balanceDuePaise: invoice.balance_due_paise
    },
    eInvoice: einvoice
  };
}
