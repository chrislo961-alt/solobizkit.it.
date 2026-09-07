import { getSession, loadWorkspace, supabase } from './backend.js';

const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
let sheetJsPromise = null;

const CONTACT_HEADERS = ['Name','Company','Email','Phone','Status','Lead source','Follow-up date','Next action','Notes'];
const CATALOG_HEADERS = ['Name','Type','Description','SKU / code','Unit','Unit price','VAT / tax %','Currency','Status'];

const CONTACT_ALIASES = {
  name: ['name','customer','customer_name','contact','contact_name','full_name','navn','kundenavn','kontakt','namn','kundnamn','kontakt_namn','kundenname','kontaktname','nombre','cliente','nombre_cliente','contacto','nom','client','nom_client','contact'],
  company: ['company','business','organization','organisation','firma','bedrift','foretag','foretaget','unternehmen','firma_name','empresa','sociedad','entreprise','societe'],
  email: ['email','email_address','e_mail','epost','e_post','e_postadresse','e_postadress','correo','correo_electronico','courriel','adresse_e_mail'],
  phone: ['phone','telephone','mobile','telefon','mobil','telefono','telefono_movil','telephone','portable'],
  status: ['status','crm_status','kundestatus','kundenstatus','estado','statut'],
  source: ['source','lead_source','crm_source','kilde','lead_kilde','kalla','lead_kalla','quelle','origen','source_du_prospect'],
  followUp: ['follow_up','followup','follow_up_date','next_follow_up','oppfolging','oppfolgingsdato','uppfoljning','uppfoljningsdatum','nachfassen','fecha_seguimiento','date_de_suivi'],
  nextAction: ['next_action','action','neste_handling','nasta_atgard','nachste_aktion','proxima_accion','prochaine_action'],
  notes: ['notes','note','comments','comment','notater','anteckningar','notizen','notas','notes_commentaires']
};

const CATALOG_ALIASES = {
  name: ['name','item','item_name','product','product_name','service','service_name','navn','produkt','produktnavn','tjeneste','namn','produktnamn','tjanst','name_product','produktname','nombre','producto','servicio','nom','produit','service'],
  kind: ['type','kind','item_type','product_type','category','kategori','typ','art','tipo','categorie'],
  description: ['description','details','beskrivelse','beskrivning','beschreibung','descripcion','description_detail'],
  sku: ['sku','code','item_code','product_code','sku_code','kode','artikelnummer','artikkelnummer','codigo','code_produit'],
  unit: ['unit','unit_type','enhet','einheit','unidad','unite'],
  unitPrice: ['unit_price','price','rate','hourly_rate','enhetspris','pris','einzelpreis','precio_unitario','prix_unitaire'],
  taxRate: ['vat','vat_rate','tax','tax_rate','mva','mva_prosent','moms','moms_procent','ust','mwst','iva','tva'],
  currency: ['currency','valuta','wahrung','moneda','devise'],
  status: ['status','active','aktiv','activo','actif','archived','arkivert','arkiverad']
};

function normalize(value = '') {
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizedText(value = '') {
  return normalize(value).replaceAll('_', ' ');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function toNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '').trim().replace(/\s/g, '');
  if (!text) return fallback;
  const normalized = text.includes(',') && !text.includes('.') ? text.replace(',', '.') : text.replace(/,/g, '');
  const number = Number(normalized.replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(number) ? number : fallback;
}

function toIsoDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const dayFirst = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dayFirst) {
    const [, d, m, y] = dayFirst;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function contactStatus(value) {
  const status = normalize(value);
  if (['client','customer','won','kunde','kund','cliente','client_final'].includes(status)) return 'client';
  if (['active','contacted','proposal','aktiv','actif','activo','kontaktet','kontaktad','contactado','contacte','angebot','offert','presupuesto','devis'].includes(status)) return 'active';
  return 'lead';
}

function catalogKind(value) {
  const kind = normalize(value);
  if (['product','produkt','producto','produit','goods','vare','vara','artikel'].includes(kind)) return 'product';
  return 'service';
}

function catalogActive(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const status = normalize(value);
  if (['0','false','no','nei','nej','inactive','archived','arkivert','arkiverad','inaktiv','inactivo','inactif','archive'].includes(status)) return false;
  return true;
}

function catalogUnit(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('m²') || raw === 'm2' || raw === 'm^2') return 'm²';
  const unit = normalize(value);
  const map = {
    item: 'item', piece: 'item', pcs: 'item', pc: 'item', stk: 'item', st: 'item', styck: 'item', einheit: 'item', unidad: 'item', unite: 'item',
    hour: 'hour', hours: 'hour', time: 'hour', timme: 'hour', stunde: 'hour', hora: 'hour', heure: 'hour',
    day: 'day', dag: 'day', tag: 'day', dia: 'day', jour: 'day',
    project: 'project', prosjekt: 'project', projekt: 'project', proyecto: 'project', projet: 'project',
    month: 'month', maned: 'month', manad: 'month', monat: 'month', mes: 'month', mois: 'month',
    kg: 'kg', kilogram: 'kg', m: 'm', meter: 'm', metre: 'm', m2: 'm²', m_2: 'm²', m²: 'm²'
  };
  return map[unit] || String(value || 'item').trim() || 'item';
}

function contactDbStatus(status) {
  return status === 'client' ? 'won' : status === 'active' ? 'contacted' : 'lead';
}

async function getSheetJs() {
  if (!sheetJsPromise) {
    sheetJsPromise = import(SHEETJS_URL).catch((error) => {
      sheetJsPromise = null;
      console.error('Could not load SheetJS', error);
      throw new Error('Excel support could not be loaded. Check your connection and try again.');
    });
  }
  return sheetJsPromise;
}

function findHeader(headers, aliases) {
  for (const alias of aliases) {
    const match = headers.find((header) => normalize(header) === alias);
    if (match !== undefined) return match;
  }
  return null;
}

function headerMap(rows, aliases) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return Object.fromEntries(Object.entries(aliases).map(([key, list]) => [key, findHeader(headers, list)]));
}

function valueFrom(row, key) {
  return key ? row[key] ?? '' : '';
}

function pickSheetName(names, kind) {
  const preferences = kind === 'catalog'
    ? ['catalog','products','product','services','katalog','produkter','produkte','productos','produits']
    : ['customers','customer','contacts','leads','kunder','kunden','clientes','clients','contacts_crm'];
  const byNormalized = new Map(names.map((name) => [normalize(name), name]));
  for (const preferred of preferences) if (byNormalized.has(preferred)) return byNormalized.get(preferred);
  return names[0] || '';
}

function mapContactRows(rows) {
  const map = headerMap(rows, CONTACT_ALIASES);
  if (!map.name) throw new Error('Could not find a Name column in the selected sheet.');
  const mapped = [];
  let invalidRows = 0;
  for (const row of rows) {
    const name = String(valueFrom(row, map.name) || '').trim();
    if (!name) { invalidRows += 1; continue; }
    mapped.push({
      name,
      company: String(valueFrom(row, map.company) || '').trim(),
      email: String(valueFrom(row, map.email) || '').trim(),
      phone: String(valueFrom(row, map.phone) || '').trim(),
      status: contactStatus(valueFrom(row, map.status)),
      source: String(valueFrom(row, map.source) || '').trim(),
      followUp: toIsoDate(valueFrom(row, map.followUp)),
      nextAction: String(valueFrom(row, map.nextAction) || '').trim(),
      notes: String(valueFrom(row, map.notes) || '').trim()
    });
  }
  return { rows: mapped, invalidRows };
}

function mapCatalogRows(rows) {
  const map = headerMap(rows, CATALOG_ALIASES);
  if (!map.name) throw new Error('Could not find a Name column in the selected sheet.');
  const mapped = [];
  let invalidRows = 0;
  for (const row of rows) {
    const name = String(valueFrom(row, map.name) || '').trim();
    if (!name) { invalidRows += 1; continue; }
    mapped.push({
      name,
      kind: catalogKind(valueFrom(row, map.kind)),
      description: String(valueFrom(row, map.description) || '').trim(),
      sku: String(valueFrom(row, map.sku) || '').trim(),
      unit: catalogUnit(valueFrom(row, map.unit)),
      unitPrice: Math.max(0, toNumber(valueFrom(row, map.unitPrice), 0)),
      taxRate: clamp(toNumber(valueFrom(row, map.taxRate), 0), 0, 100),
      currency: String(valueFrom(row, map.currency) || '').trim().toUpperCase(),
      active: catalogActive(valueFrom(row, map.status))
    });
  }
  return { rows: mapped, invalidRows };
}

export async function previewSpreadsheetImport(file, kind = 'contacts') {
  if (!file) throw new Error('Choose an Excel or CSV file first.');
  const XLSX = await getSheetJs();
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sheetName = pickSheetName(workbook.SheetNames || [], kind);
  if (!sheetName) throw new Error('The workbook does not contain any worksheets.');
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });
  if (!rawRows.length) throw new Error('The selected worksheet has no data rows.');
  const mapped = kind === 'catalog' ? mapCatalogRows(rawRows) : mapContactRows(rawRows);
  if (!mapped.rows.length) throw new Error('No importable rows were found.');
  return {
    kind: kind === 'catalog' ? 'catalog' : 'contacts',
    fileName: file.name || 'spreadsheet',
    sheetName,
    totalRows: rawRows.length,
    validRows: mapped.rows.length,
    invalidRows: mapped.invalidRows,
    rows: mapped.rows
  };
}

function contactKeys(row) {
  const email = String(row.email || '').trim().toLowerCase();
  const nameCompany = `${normalizedText(row.name)}|${normalizedText(row.company)}`;
  return { email: email ? `email:${email}` : '', nameCompany: `name:${nameCompany}` };
}

function catalogKeys(row) {
  const sku = String(row.sku || '').trim().toLowerCase();
  const fallback = `${normalizedText(row.name)}|${String(row.currency || '').toUpperCase()}|${normalizedText(row.unit)}`;
  return { sku: sku ? `sku:${sku}` : '', fallback: `item:${fallback}` };
}

async function insertInChunks(table, rows, size = 100) {
  for (let index = 0; index < rows.length; index += size) {
    const { error } = await supabase.from(table).insert(rows.slice(index, index + size));
    if (error) throw error;
  }
}

async function importContacts(userId, preview) {
  const { data: existing, error } = await supabase.from('customers').select('name,company,email').eq('user_id', userId);
  if (error) throw error;
  const emailKeys = new Set();
  const nameKeys = new Set();
  for (const row of existing || []) {
    const keys = contactKeys(row);
    if (keys.email) emailKeys.add(keys.email);
    nameKeys.add(keys.nameCompany);
  }

  let duplicates = 0;
  const inserts = [];
  for (const row of preview.rows.slice(0, 2000)) {
    const keys = contactKeys(row);
    if ((keys.email && emailKeys.has(keys.email)) || nameKeys.has(keys.nameCompany)) {
      duplicates += 1;
      continue;
    }
    if (keys.email) emailKeys.add(keys.email);
    nameKeys.add(keys.nameCompany);
    inserts.push({
      user_id: userId,
      name: row.name,
      company: row.company || null,
      email: row.email || null,
      phone: row.phone || null,
      notes: row.notes || null,
      crm_enabled: true,
      crm_archived: false,
      crm_status: contactDbStatus(row.status),
      crm_notes: row.notes || null,
      crm_source: row.source || 'Excel import',
      crm_follow_up: row.followUp || null,
      crm_next_action: row.nextAction || null,
      crm_updated_at: new Date().toISOString()
    });
  }
  await insertInChunks('customers', inserts);
  return { imported: inserts.length, duplicates, invalid: preview.invalidRows, limited: Math.max(0, preview.rows.length - 2000) };
}

async function importCatalog(userId, preview) {
  const [existingResult, settingsResult] = await Promise.all([
    supabase.from('products').select('name,sku,currency,unit').eq('user_id', userId),
    supabase.from('company_settings').select('default_currency').eq('user_id', userId).maybeSingle()
  ]);
  if (existingResult.error) throw existingResult.error;
  if (settingsResult.error) throw settingsResult.error;
  const defaultCurrency = String(settingsResult.data?.default_currency || 'USD').toUpperCase();
  const skuKeys = new Set();
  const fallbackKeys = new Set();
  for (const row of existingResult.data || []) {
    const keys = catalogKeys(row);
    if (keys.sku) skuKeys.add(keys.sku);
    fallbackKeys.add(keys.fallback);
  }

  let duplicates = 0;
  const inserts = [];
  for (const row of preview.rows.slice(0, 2000)) {
    const normalizedRow = { ...row, currency: /^[A-Z]{3}$/.test(row.currency) ? row.currency : defaultCurrency };
    const keys = catalogKeys(normalizedRow);
    if ((keys.sku && skuKeys.has(keys.sku)) || fallbackKeys.has(keys.fallback)) {
      duplicates += 1;
      continue;
    }
    if (keys.sku) skuKeys.add(keys.sku);
    fallbackKeys.add(keys.fallback);
    inserts.push({
      user_id: userId,
      name: normalizedRow.name,
      description: normalizedRow.description || null,
      kind: normalizedRow.kind,
      sku: normalizedRow.sku || null,
      unit: normalizedRow.unit,
      unit_price: normalizedRow.unitPrice,
      tax_rate: normalizedRow.taxRate,
      currency: normalizedRow.currency,
      active: normalizedRow.active,
      updated_at: new Date().toISOString()
    });
  }
  await insertInChunks('products', inserts);
  return { imported: inserts.length, duplicates, invalid: preview.invalidRows, limited: Math.max(0, preview.rows.length - 2000) };
}

export async function commitSpreadsheetImport(preview) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error('Sign in before importing data.');
  if (!preview?.rows?.length) throw new Error('No importable rows were found.');
  return preview.kind === 'catalog'
    ? importCatalog(session.user.id, preview)
    : importContacts(session.user.id, preview);
}

function invoiceTotals(lines = [], taxRate = 0) {
  const subtotal = lines.reduce((sum, line) => sum + toNumber(line.qty) * toNumber(line.rate), 0);
  const tax = subtotal * (toNumber(taxRate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

function recurringTotal(profile) {
  const beforeDiscount = (profile.recurring_invoice_items || []).reduce((sum, line) => {
    const subtotal = toNumber(line.quantity) * toNumber(line.unit_price);
    return sum + subtotal * (1 + toNumber(line.tax_rate) / 100);
  }, 0);
  return beforeDiscount * (1 - clamp(toNumber(profile.discount_rate), 0, 100) / 100);
}

function colName(index) {
  let number = index;
  let name = '';
  while (number > 0) {
    number -= 1;
    name = String.fromCharCode(65 + (number % 26)) + name;
    number = Math.floor(number / 26);
  }
  return name || 'A';
}

function appendSheet(XLSX, workbook, name, rows, headers) {
  const worksheet = rows.length
    ? XLSX.utils.json_to_sheet(rows, { header: headers })
    : XLSX.utils.aoa_to_sheet([headers]);
  worksheet['!autofilter'] = { ref: `A1:${colName(headers.length)}1` };
  worksheet['!cols'] = headers.map((header) => {
    let width = String(header).length + 2;
    for (const row of rows.slice(0, 250)) width = Math.max(width, Math.min(44, String(row[header] ?? '').length + 2));
    return { wch: Math.min(44, Math.max(10, width)) };
  });
  XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
}

function downloadXlsx(XLSX, workbook, filename) {
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true });
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function exportWorkspaceExcel() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error('Sign in before exporting data.');
  const userId = session.user.id;
  const [workspace, productsResult, recurringResult] = await Promise.all([
    loadWorkspace(userId),
    supabase.from('products').select('*').eq('user_id', userId).order('name'),
    supabase.from('recurring_invoice_profiles').select('*, recurring_invoice_items(*)').eq('user_id', userId).order('created_at', { ascending: false })
  ]);
  if (productsResult.error) throw productsResult.error;
  if (recurringResult.error) throw recurringResult.error;

  const XLSX = await getSheetJs();
  const workbook = XLSX.utils.book_new();
  workbook.Props = { Title: 'SoloBizKit data export', Subject: 'Business data export', Author: 'SoloBizKit' };
  const customerNames = new Map(workspace.customers.map((customer) => [customer.id, customer.name]));

  const contactRows = workspace.customers.map((customer) => ({
    'Name': customer.name,
    'Company': customer.company,
    'Email': customer.email,
    'Phone': customer.phone,
    'Status': customer.status,
    'Lead source': customer.source,
    'Follow-up date': customer.followUp,
    'Next action': customer.nextAction,
    'Notes': customer.notes
  }));
  appendSheet(XLSX, workbook, 'Customers', contactRows, CONTACT_HEADERS);
  appendSheet(XLSX, workbook, 'Leads', contactRows.filter((row) => row.Status !== 'client'), CONTACT_HEADERS);

  const invoiceRows = workspace.invoices.map((invoice) => {
    const totals = invoiceTotals(invoice.lines, invoice.taxRate);
    return {
      'Invoice number': invoice.number,
      'Customer': customerNames.get(invoice.customerId) || '',
      'Issue date': invoice.issueDate,
      'Due date': invoice.dueDate,
      'Status': invoice.status,
      'Currency': invoice.currency,
      'VAT / tax %': invoice.taxRate,
      'Subtotal': totals.subtotal,
      'VAT / tax': totals.tax,
      'Total': totals.total,
      'Notes': invoice.notes
    };
  });
  appendSheet(XLSX, workbook, 'Invoices', invoiceRows, ['Invoice number','Customer','Issue date','Due date','Status','Currency','VAT / tax %','Subtotal','VAT / tax','Total','Notes']);
  appendSheet(XLSX, workbook, 'Invoice lines', workspace.invoices.flatMap((invoice) => (invoice.lines || []).map((line) => ({
    'Invoice number': invoice.number,
    'Description': line.description,
    'Quantity': line.qty,
    'Unit price': line.rate,
    'VAT / tax %': invoice.taxRate,
    'Line subtotal': toNumber(line.qty) * toNumber(line.rate)
  }))), ['Invoice number','Description','Quantity','Unit price','VAT / tax %','Line subtotal']);

  const estimateRows = workspace.estimates.map((estimate) => {
    const totals = invoiceTotals(estimate.lines, estimate.taxRate);
    return {
      'Estimate number': estimate.number,
      'Customer': customerNames.get(estimate.customerId) || '',
      'Issue date': estimate.issueDate,
      'Valid until': estimate.validUntil,
      'Status': estimate.status,
      'Currency': estimate.currency,
      'VAT / tax %': estimate.taxRate,
      'Subtotal': totals.subtotal,
      'VAT / tax': totals.tax,
      'Total': totals.total,
      'Notes': estimate.notes
    };
  });
  appendSheet(XLSX, workbook, 'Estimates', estimateRows, ['Estimate number','Customer','Issue date','Valid until','Status','Currency','VAT / tax %','Subtotal','VAT / tax','Total','Notes']);
  appendSheet(XLSX, workbook, 'Estimate lines', workspace.estimates.flatMap((estimate) => (estimate.lines || []).map((line) => ({
    'Estimate number': estimate.number,
    'Description': line.description,
    'Quantity': line.qty,
    'Unit price': line.rate,
    'VAT / tax %': estimate.taxRate,
    'Line subtotal': toNumber(line.qty) * toNumber(line.rate)
  }))), ['Estimate number','Description','Quantity','Unit price','VAT / tax %','Line subtotal']);

  const recurring = recurringResult.data || [];
  appendSheet(XLSX, workbook, 'Recurring', recurring.map((profile) => ({
    'Name': profile.name,
    'Customer': customerNames.get(profile.customer_id) || '',
    'Status': profile.active ? 'active' : 'paused',
    'Frequency': profile.frequency,
    'Every': profile.interval_count,
    'Next invoice date': profile.next_issue_date,
    'Currency': profile.currency,
    'Discount %': profile.discount_rate,
    'Total': recurringTotal(profile),
    'Notes': profile.notes || ''
  })), ['Name','Customer','Status','Frequency','Every','Next invoice date','Currency','Discount %','Total','Notes']);
  appendSheet(XLSX, workbook, 'Recurring lines', recurring.flatMap((profile) => (profile.recurring_invoice_items || []).map((line) => ({
    'Profile': profile.name,
    'Description': line.description,
    'Quantity': line.quantity,
    'Unit price': line.unit_price,
    'VAT / tax %': line.tax_rate
  }))), ['Profile','Description','Quantity','Unit price','VAT / tax %']);

  appendSheet(XLSX, workbook, 'Catalog', (productsResult.data || []).map((item) => ({
    'Name': item.name,
    'Type': item.kind,
    'Description': item.description || '',
    'SKU / code': item.sku || '',
    'Unit': item.unit || 'item',
    'Unit price': toNumber(item.unit_price),
    'VAT / tax %': toNumber(item.tax_rate),
    'Currency': item.currency,
    'Status': item.active ? 'active' : 'archived'
  })), CATALOG_HEADERS);

  appendSheet(XLSX, workbook, 'Export info', [
    { 'Item': 'Product', 'Value': 'SoloBizKit Pro' },
    { 'Item': 'Exported at', 'Value': new Date().toISOString() },
    { 'Item': 'Account', 'Value': session.user.email || '' },
    { 'Item': 'Format version', 'Value': '1' }
  ], ['Item','Value']);

  const filename = `solobizkit-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadXlsx(XLSX, workbook, filename);
  return { filename, sheets: workbook.SheetNames.length };
}

export async function downloadSpreadsheetTemplate(kind = 'contacts') {
  const XLSX = await getSheetJs();
  const workbook = XLSX.utils.book_new();
  if (kind === 'catalog') appendSheet(XLSX, workbook, 'Catalog', [], CATALOG_HEADERS);
  else appendSheet(XLSX, workbook, 'Customers', [], CONTACT_HEADERS);
  appendSheet(XLSX, workbook, 'Instructions', [
    { 'Field': 'Required', 'Value': 'Name' },
    { 'Field': 'Supported formats', 'Value': '.xlsx, .xls, .csv' },
    { 'Field': 'Duplicates', 'Value': 'Existing matches are skipped and never overwritten.' }
  ], ['Field','Value']);
  const filename = kind === 'catalog' ? 'solobizkit-catalog-import-template.xlsx' : 'solobizkit-contacts-import-template.xlsx';
  downloadXlsx(XLSX, workbook, filename);
  return { filename };
}
