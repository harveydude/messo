/**
 * Indian GST Tax Service
 * Calculates CGST, SGST, IGST in integer paise
 */
export function calculateGST({
  taxablePaise,
  ratePct = 18.0,
  supplierStateCode = '27', // Default Maharashtra
  placeOfSupplyCode = '27'
}) {
  const isIntraState = supplierStateCode === placeOfSupplyCode;
  const totalTaxPaise = Math.round((taxablePaise * ratePct) / 100);

  if (isIntraState) {
    const halfRate = ratePct / 2;
    const cgstPaise = Math.round(totalTaxPaise / 2);
    const sgstPaise = totalTaxPaise - cgstPaise;

    return {
      type: 'CGST_SGST',
      ratePct,
      cgstRate: halfRate,
      sgstRate: halfRate,
      cgstPaise,
      sgstPaise,
      igstPaise: 0,
      totalTaxPaise,
    };
  } else {
    return {
      type: 'IGST',
      ratePct,
      cgstRate: 0,
      sgstRate: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: totalTaxPaise,
      totalTaxPaise,
    };
  }
}
