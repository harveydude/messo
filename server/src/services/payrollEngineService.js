/**
 * Phase 46: Indian Payroll & Statutory Compliance Engine
 * Calculates Basic, HRA, Allowances, EPF (12% ceiling/actuals), ESI, state-wise PT, 
 * Section 192 Salary TDS, compiles payslips and creates balanced payroll journal entries.
 */

import { getDb } from '../db/db.js';

/**
 * State-wise Professional Tax (PT) slab resolver
 */
export function calculateProfessionalTax(state = 'MH', grossMonthlyPaise) {
  const grossRupees = grossMonthlyPaise / 100;
  const stateUpper = (state || 'MH').toUpperCase();

  switch (stateUpper) {
    case 'MH': // Maharashtra
      // ₹0-7500: Nil, ₹7501-10000: ₹175, >₹10000: ₹200 (₹300 in Feb)
      if (grossRupees > 10000) return 20000;
      if (grossRupees > 7500) return 17500;
      return 0;

    case 'KA': // Karnataka
      // < ₹15,000: Nil, >= ₹15,000: ₹200
      if (grossRupees >= 15000) return 20000;
      return 0;

    case 'TS': // Telangana
    case 'AP': // Andhra Pradesh
      if (grossRupees > 20000) return 20000;
      if (grossRupees > 15000) return 15000;
      return 0;

    case 'TN': // Tamil Nadu
      if (grossRupees > 25000) return 20833; // ~₹2500 / 12 months
      return 0;

    case 'DL': // Delhi has no Professional Tax
      return 0;

    default:
      return grossRupees >= 15000 ? 20000 : 0;
  }
}

/**
 * Section 192 Salary TDS Calculator under New Tax Regime (FY 2026-27 defaults)
 */
export function calculateSalaryTds(annualGrossPaise, taxRegime = 'NEW') {
  const annualGrossRupees = annualGrossPaise / 100;
  const standardDeduction = 75000; // Union Budget standard deduction
  const taxableIncome = Math.max(0, annualGrossRupees - standardDeduction);

  // Full rebate under Section 87A if taxable income <= ₹7,00,000
  if (taxableIncome <= 700000) {
    return 0;
  }

  let tax = 0;
  // Slabs:
  // 0 - 3,00,000: 0%
  // 3,00,001 - 7,00,000: 5% (₹20,000)
  // 7,00,001 - 10,00,000: 10% (₹30,000)
  // 10,00,001 - 12,00,000: 15% (₹30,000)
  // 12,00,001 - 15,00,000: 20% (₹60,000)
  // Above 15,00,000: 30%

  if (taxableIncome > 300000) {
    const slab1 = Math.min(taxableIncome, 700000) - 300000;
    tax += slab1 * 0.05;
  }
  if (taxableIncome > 700000) {
    const slab2 = Math.min(taxableIncome, 1000000) - 700000;
    tax += slab2 * 0.10;
  }
  if (taxableIncome > 1000000) {
    const slab3 = Math.min(taxableIncome, 1200000) - 1000000;
    tax += slab3 * 0.15;
  }
  if (taxableIncome > 1200000) {
    const slab4 = Math.min(taxableIncome, 1500000) - 1200000;
    tax += slab4 * 0.20;
  }
  if (taxableIncome > 1500000) {
    const slab5 = taxableIncome - 1500000;
    tax += slab5 * 0.30;
  }

  // 4% Health & Education Cess
  const totalTaxAnnual = tax * 1.04;
  const monthlyTdsRupees = Math.round(totalTaxAnnual / 12);
  return monthlyTdsRupees * 100; // in paise
}

/**
 * Onboard / Create Employee
 */
export async function createEmployee(companyId = 'comp_1', employeeData) {
  const db = await getDb();
  const id = employeeData.id || 'emp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  const res = await db.query(
    `INSERT INTO employees (
      id, company_id, employee_code, name, email, pan, uan, esi_ip_number, state,
      ctc_annual_paise, basic_monthly_paise, hra_monthly_paise, allowances_monthly_paise,
      tax_regime, is_epf_eligible, is_esi_eligible, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (company_id, employee_code) DO UPDATE SET
      name = EXCLUDED.name,
      ctc_annual_paise = EXCLUDED.ctc_annual_paise,
      basic_monthly_paise = EXCLUDED.basic_monthly_paise,
      hra_monthly_paise = EXCLUDED.hra_monthly_paise,
      allowances_monthly_paise = EXCLUDED.allowances_monthly_paise
    RETURNING *`,
    [
      id,
      companyId,
      employeeData.employeeCode,
      employeeData.name,
      employeeData.email || '',
      employeeData.pan || '',
      employeeData.uan || '',
      employeeData.esiIpNumber || '',
      employeeData.state || 'MH',
      parseInt(employeeData.ctcAnnualPaise, 10),
      parseInt(employeeData.basicMonthlyPaise, 10),
      parseInt(employeeData.hraMonthlyPaise, 10),
      parseInt(employeeData.allowancesMonthlyPaise || 0, 10),
      employeeData.taxRegime || 'NEW',
      employeeData.isEpfEligible !== false,
      employeeData.isEsiEligible !== false,
      employeeData.isActive !== false
    ]
  );

  return res.rows[0];
}

/**
 * Compute monthly statutory deductions & net pay for an individual employee
 */
export function computeEmployeePay({
  basicMonthlyPaise,
  hraMonthlyPaise,
  allowancesMonthlyPaise = 0,
  isEpfEligible = true,
  isEsiEligible = true,
  state = 'MH',
  taxRegime = 'NEW',
  ctcAnnualPaise
}) {
  const grossMonthlyPaise = basicMonthlyPaise + hraMonthlyPaise + allowancesMonthlyPaise;

  // 1. EPF (Employees' Provident Fund)
  // Statutory wage ceiling: ₹15,000 (15,00,000 paise). 12% on Basic (capped at wage ceiling)
  let employeeEpfPaise = 0;
  let employerEpfPaise = 0;
  if (isEpfEligible) {
    const epfWagePaise = Math.min(basicMonthlyPaise, 1500000);
    employeeEpfPaise = Math.round(epfWagePaise * 0.12);
    employerEpfPaise = Math.round(epfWagePaise * 0.12);
  }

  // 2. ESI (Employee State Insurance)
  // Applicable only if monthly gross <= ₹21,000 (21,00,000 paise)
  let employeeEsiPaise = 0;
  let employerEsiPaise = 0;
  if (isEsiEligible && grossMonthlyPaise <= 2100000) {
    employeeEsiPaise = Math.round(grossMonthlyPaise * 0.0075); // 0.75%
    employerEsiPaise = Math.round(grossMonthlyPaise * 0.0325); // 3.25%
  }

  // 3. Professional Tax (PT)
  const professionalTaxPaise = calculateProfessionalTax(state, grossMonthlyPaise);

  // 4. Section 192 Salary TDS
  const annualGrossPaise = ctcAnnualPaise || (grossMonthlyPaise * 12);
  const tds192Paise = calculateSalaryTds(annualGrossPaise, taxRegime);

  // 5. Net Pay to Employee
  const netPayPaise = grossMonthlyPaise - employeeEpfPaise - employeeEsiPaise - professionalTaxPaise - tds192Paise;

  return {
    basicPaise: basicMonthlyPaise,
    hraPaise: hraMonthlyPaise,
    allowancesPaise: allowancesMonthlyPaise,
    grossPaise: grossMonthlyPaise,
    employeeEpfPaise,
    employerEpfPaise,
    employeeEsiPaise,
    employerEsiPaise,
    professionalTaxPaise,
    tds192Paise,
    netPayPaise
  };
}

/**
 * Execute complete monthly payroll run & post balanced double-entry journal entry
 */
export async function executeMonthlyPayrollRun({
  companyId = 'comp_1',
  periodMonth, // e.g. '2026-09'
  employeeIds = []
}) {
  const db = await getDb();

  // Retrieve employees
  let empQuery = `SELECT * FROM employees WHERE company_id = $1 AND is_active = TRUE`;
  const empParams = [companyId];
  if (employeeIds.length > 0) {
    empQuery += ` AND id = ANY($2::text[])`;
    empParams.push(employeeIds);
  }

  const empsRes = await db.query(empQuery, empParams);
  if (empsRes.rows.length === 0) {
    throw new Error(`No active employees found for company ${companyId}`);
  }

  const payrollRunId = 'pr_' + periodMonth.replace('-', '') + '_' + Date.now();

  let totalGross = 0;
  let totalEmployeeEpf = 0;
  let totalEmployerEpf = 0;
  let totalEmployeeEsi = 0;
  let totalEmployerEsi = 0;
  let totalPt = 0;
  let totalTds = 0;
  let totalNetPay = 0;

  const payslipsData = [];

  for (const emp of empsRes.rows) {
    const pay = computeEmployeePay({
      basicMonthlyPaise: parseInt(emp.basic_monthly_paise, 10),
      hraMonthlyPaise: parseInt(emp.hra_monthly_paise, 10),
      allowancesMonthlyPaise: parseInt(emp.allowances_monthly_paise || 0, 10),
      isEpfEligible: emp.is_epf_eligible,
      isEsiEligible: emp.is_esi_eligible,
      state: emp.state,
      taxRegime: emp.tax_regime,
      ctcAnnualPaise: parseInt(emp.ctc_annual_paise, 10)
    });

    totalGross += pay.grossPaise;
    totalEmployeeEpf += pay.employeeEpfPaise;
    totalEmployerEpf += pay.employerEpfPaise;
    totalEmployeeEsi += pay.employeeEsiPaise;
    totalEmployerEsi += pay.employerEsiPaise;
    totalPt += pay.professionalTaxPaise;
    totalTds += pay.tds192Paise;
    totalNetPay += pay.netPayPaise;

    payslipsData.push({
      id: 'ps_' + emp.id + '_' + periodMonth.replace('-', ''),
      payrollRunId,
      employeeId: emp.id,
      companyId,
      periodMonth,
      ...pay
    });
  }

  // 1. Create payroll run entry
  await db.query(
    `INSERT INTO payroll_runs (
      id, company_id, period_month, status,
      gross_pay_paise, employee_epf_paise, employer_epf_paise,
      employee_esi_paise, employer_esi_paise, professional_tax_paise,
      tds_192_paise, net_pay_paise,
      total_gross_paise, total_taxes_paise, total_deductions_paise, total_net_paise,
      pay_period_start, pay_period_end, pay_date
    ) VALUES ($1, $2, $3, 'PROCESSED', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE)
    ON CONFLICT (company_id, period_month) DO UPDATE SET
      status = 'PROCESSED',
      gross_pay_paise = EXCLUDED.gross_pay_paise,
      employee_epf_paise = EXCLUDED.employee_epf_paise,
      employer_epf_paise = EXCLUDED.employer_epf_paise,
      employee_esi_paise = EXCLUDED.employee_esi_paise,
      employer_esi_paise = EXCLUDED.employer_esi_paise,
      professional_tax_paise = EXCLUDED.professional_tax_paise,
      tds_192_paise = EXCLUDED.tds_192_paise,
      net_pay_paise = EXCLUDED.net_pay_paise,
      total_gross_paise = EXCLUDED.total_gross_paise,
      total_taxes_paise = EXCLUDED.total_taxes_paise,
      total_deductions_paise = EXCLUDED.total_deductions_paise,
      total_net_paise = EXCLUDED.total_net_paise`,
    [
      payrollRunId,
      companyId,
      periodMonth,
      totalGross,
      totalEmployeeEpf,
      totalEmployerEpf,
      totalEmployeeEsi,
      totalEmployerEsi,
      totalPt,
      totalTds,
      totalNetPay,
      totalGross,
      (totalPt + totalTds),
      (totalEmployeeEpf + totalEmployeeEsi + totalPt + totalTds),
      totalNetPay
    ]
  );

  // 2. Insert payslips
  for (const ps of payslipsData) {
    await db.query(
      `INSERT INTO payslips (
        id, payroll_run_id, employee_id, company_id, period_month,
        basic_paise, hra_paise, allowances_paise, gross_paise,
        employee_epf_paise, employer_epf_paise, employee_esi_paise,
        employer_esi_paise, professional_tax_paise, tds_192_paise, net_pay_paise
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        ps.id,
        payrollRunId,
        ps.employeeId,
        companyId,
        periodMonth,
        ps.basicPaise,
        ps.hraPaise,
        ps.allowancesPaise,
        ps.grossPaise,
        ps.employeeEpfPaise,
        ps.employerEpfPaise,
        ps.employeeEsiPaise,
        ps.employerEsiPaise,
        ps.professionalTaxPaise,
        ps.tds192Paise,
        ps.netPayPaise
      ]
    );
  }

  // 3. Generate balanced GL Journal Entry
  // Debits:
  //   acc_salaries_expense (Gross)
  //   acc_employer_epf_exp (Employer EPF)
  //   acc_employer_esi_exp (Employer ESI)
  // Credits:
  //   acc_salaries_payable (Net Pay)
  //   acc_epf_payable (Employee EPF + Employer EPF)
  //   acc_esi_payable (Employee ESI + Employer ESI)
  //   acc_pt_payable (PT)
  //   acc_tds_192_payable (TDS 192)
  const jeId = 'je_pr_' + periodMonth.replace('-', '') + '_' + Date.now();
  const entryNumber = 'PAYROLL-' + periodMonth + '-' + Date.now();

  await db.query(
    `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, source_id, status)
     VALUES ($1, $2, $3, CURRENT_DATE, $4, 'PAYROLL', $5, 'POSTED')`,
    [jeId, companyId, entryNumber, `Payroll Processing for ${periodMonth}`, payrollRunId]
  );

  const lines = [
    // Debits
    { accountId: 'acc_salaries_expense', debit: totalGross, credit: 0, desc: `Gross Salaries & Wages for ${periodMonth}` },
    { accountId: 'acc_employer_epf_exp', debit: totalEmployerEpf, credit: 0, desc: `Employer EPF Contribution for ${periodMonth}` },
    { accountId: 'acc_employer_esi_exp', debit: totalEmployerEsi, credit: 0, desc: `Employer ESI Contribution for ${periodMonth}` },
    // Credits
    { accountId: 'acc_salaries_payable', debit: 0, credit: totalNetPay, desc: `Net Salaries Payable to Employees for ${periodMonth}` },
    { accountId: 'acc_epf_payable', debit: 0, credit: (totalEmployeeEpf + totalEmployerEpf), desc: `Total EPF Statutory Dues for ${periodMonth}` },
    { accountId: 'acc_esi_payable', debit: 0, credit: (totalEmployeeEsi + totalEmployerEsi), desc: `Total ESI Statutory Dues for ${periodMonth}` },
    { accountId: 'acc_pt_payable', debit: 0, credit: totalPt, desc: `Professional Tax Payable for ${periodMonth}` },
    { accountId: 'acc_tds_192_payable', debit: 0, credit: totalTds, desc: `Salary TDS u/s 192 Payable for ${periodMonth}` }
  ].filter(l => l.debit > 0 || l.credit > 0);

  if (lines.length > 0) {
    const valueClauses = [];
    const params = [jeId];
    let pIdx = 2;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineId = `jel_pr_${i}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      valueClauses.push(`($${pIdx}, $1, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4})`);
      params.push(lineId, line.accountId, line.debit, line.credit, line.desc);
      pIdx += 5;
    }

    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ${valueClauses.join(', ')}`,
      params
    );
  }

  // Update payroll_run with journal_entry_id
  await db.query(
    `UPDATE payroll_runs SET journal_entry_id = $1 WHERE id = $2`,
    [jeId, payrollRunId]
  );

  return {
    success: true,
    payrollRunId,
    periodMonth,
    headcount: empsRes.rows.length,
    totals: {
      totalGrossPaise: totalGross,
      totalEmployeeEpfPaise: totalEmployeeEpf,
      totalEmployerEpfPaise: totalEmployerEpf,
      totalEmployeeEsiPaise: totalEmployeeEsi,
      totalEmployerEsiPaise: totalEmployerEsi,
      totalPtPaise: totalPt,
      totalTdsPaise: totalTds,
      totalNetPayPaise: totalNetPay
    },
    journalEntryId: jeId
  };
}
