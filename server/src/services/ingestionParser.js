import crypto from 'crypto';
import xlsx from 'xlsx';

/**
 * Computes SHA-256 hash of a file buffer or text.
 */
export function computeFileChecksum(content) {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(content)) {
    hash.update(content);
  } else {
    hash.update(String(content), 'utf8');
  }
  return hash.digest('hex');
}

/**
 * Universal Multi-Format Raw Ingestion Parser
 * Converts .xlsx, .csv, JSON, Tally XML, or SQL dump into raw records.
 */
export function parseRawImportFile({ content, fileName, formatHint }) {
  const format = (formatHint || detectFormat(fileName)).toUpperCase();
  const checksum = computeFileChecksum(content);

  let rows = [];

  switch (format) {
    case 'JSON': {
      const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed : (parsed.data || parsed.rows || [parsed]);
      break;
    }

    case 'CSV': {
      const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
      rows = parseCsv(text);
      break;
    }

    case 'XLSX': {
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      break;
    }

    case 'TALLY_XML': {
      const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
      rows = parseTallyXml(text);
      break;
    }

    case 'SQL': {
      const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
      rows = parseSqlDump(text);
      break;
    }

    default:
      throw new Error(`Unsupported file format: ${format}. Supported formats: XLSX, CSV, JSON, TALLY_XML, SQL.`);
  }

  return {
    fileName,
    fileFormat: format,
    fileSha256: checksum,
    totalRows: rows.length,
    rows
  };
}

function detectFormat(fileName = '') {
  const ext = fileName.toLowerCase().split('.').pop();
  if (['xlsx', 'xls'].includes(ext)) return 'XLSX';
  if (ext === 'csv') return 'CSV';
  if (ext === 'json') return 'JSON';
  if (['xml', 'tally'].includes(ext)) return 'TALLY_XML';
  if (ext === 'sql') return 'SQL';
  return 'CSV';
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

function splitCsvLine(line) {
  const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
  const result = [];
  let match;
  while ((match = regex.exec(line))) {
    let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
    result.push(val ? val.trim() : '');
  }
  return result;
}

function parseTallyXml(xmlText) {
  const vouchers = [];
  const voucherRegex = /<VOUCHER[^>]*>([\s\S]*?)<\/VOUCHER>/gi;
  let vMatch;

  while ((vMatch = voucherRegex.exec(xmlText))) {
    const vContent = vMatch[1];
    const extract = (tag) => {
      const m = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i').exec(vContent);
      return m ? m[1].trim() : '';
    };

    const voucherNumber = extract('VOUCHERNUMBER');
    const date = extract('DATE');
    const partyName = extract('PARTYLEDGERNAME') || extract('PARTYNAME');
    const amount = extract('AMOUNT') || extract('PAIDAMOUNT');
    const voucherType = extract('VOUCHERTYPENAME');
    const narration = extract('NARRATION');

    vouchers.push({
      VOUCHERNUMBER: voucherNumber,
      DATE: date,
      PARTYNAME: partyName,
      AMOUNT: amount,
      VOUCHERTYPE: voucherType,
      NARRATION: narration,
      _source: 'TALLY'
    });
  }

  // If no vouchers, parse general ledgers
  if (vouchers.length === 0) {
    const ledgerRegex = /<LEDGER[^>]*NAME="([^"]+)"[^>]*>([\s\S]*?)<\/LEDGER>/gi;
    let lMatch;
    while ((lMatch = ledgerRegex.exec(xmlText))) {
      vouchers.push({
        LEDGERNAME: lMatch[1],
        _source: 'TALLY_LEDGER'
      });
    }
  }

  return vouchers;
}

function parseSqlDump(sqlText) {
  const rows = [];
  // Match INSERT INTO table (col1, col2) VALUES (val1, val2);
  const insertRegex = /INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\);/gi;
  let match;

  while ((match = insertRegex.exec(sqlText))) {
    const table = match[1];
    const cols = match[2].split(',').map(c => c.replace(/[`"' ]/g, '').trim());
    const rawVals = match[3].split(',').map(v => v.replace(/^['"]|['"]$/g, '').trim());

    const obj = { _table: table };
    cols.forEach((col, idx) => {
      obj[col] = rawVals[idx] !== undefined ? rawVals[idx] : null;
    });
    rows.push(obj);
  }

  return rows;
}
