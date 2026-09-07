import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = 'https://eaqddwqprhofpizbpziq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9PpiWr0duM-ve-mcqkCysg_BpX58a9O';
const SOLOBIzKIT_PRO_URL = 'https://solobizkit.it.com/pro/';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
});

const crmToDb = { lead: 'lead', active: 'contacted', client: 'won' };
const crmFromDb = { lead: 'lead', contacted: 'active', proposal: 'active', won: 'client', lost: 'lead' };
let workspaceCache = null;

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    workspaceCache = null;
    callback(event, session);
  });
  return () => data.subscription.unsubscribe();
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  workspaceCache = null;
  return data.session;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: SOLOBIzKIT_PRO_URL, data: { source_app: 'solobizkit' } } });
  if (error) throw error;
  workspaceCache = null;
  return data;
}

export async function signOut() {
  workspaceCache = null;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getWorkspaceContext(force = false) {
  if (!force && workspaceCache) return workspaceCache;
  const session = await getSession();
  if (!session?.user?.id) return null;
  await supabase.rpc('ensure_my_workspace');
  const [{ data: current, error: currentError }, { data: all, error: allError }] = await Promise.all([
    supabase.rpc('get_current_workspace'),
    supabase.rpc('list_my_workspaces'),
  ]);
  if (currentError) throw currentError;
  if (allError) throw allError;
  const row = Array.isArray(current) ? current[0] : current;
  workspaceCache = row ? {
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    name: row.workspace_name,
    role: row.role,
    isOwner: Boolean(row.is_owner),
    canWrite: ['owner','admin','member'].includes(row.role),
    canAdmin: ['owner','admin'].includes(row.role),
    workspaces: (all || []).map((item) => ({ workspaceId: item.workspace_id, ownerId: item.owner_id, name: item.workspace_name, role: item.role, active: Boolean(item.is_active) })),
  } : null;
  return workspaceCache;
}

export async function setActiveWorkspace(workspaceId) {
  const { error } = await supabase.rpc('set_active_workspace', { p_workspace_id: workspaceId });
  if (error) throw error;
  workspaceCache = null;
  return getWorkspaceContext(true);
}

export async function getDataOwnerId() {
  const context = await getWorkspaceContext();
  return context?.ownerId || null;
}

async function ownerId(fallbackUserId = null) {
  return (await getDataOwnerId()) || fallbackUserId;
}

async function requireWriteAccess() {
  const context = await getWorkspaceContext();
  if (!context?.canWrite) throw new Error('Editor access is required to change workspace data.');
  return context;
}

function mapInvoiceRow(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    number: row.invoice_number,
    issueDate: row.issue_date,
    dueDate: row.due_date || '',
    status: row.status,
    currency: row.currency,
    taxRate: Number(row.invoice_items?.[0]?.tax_rate || 0),
    lines: [...(row.invoice_items || [])].sort((a,b)=>a.position-b.position).map((item)=>({ description:item.description, qty:Number(item.quantity), rate:Number(item.unit_price) })),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEstimateRow(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    number: row.estimate_number,
    issueDate: row.issue_date,
    validUntil: row.valid_until || '',
    status: row.status,
    currency: row.currency,
    taxRate: Number(row.estimate_items?.[0]?.tax_rate || 0),
    convertedInvoiceId: row.converted_invoice_id,
    lines: [...(row.estimate_items || [])].sort((a,b)=>a.position-b.position).map((item)=>({ description:item.description, qty:Number(item.quantity), rate:Number(item.unit_price) })),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadWorkspace(userId) {
  const dataOwner = await ownerId(userId);
  if (!dataOwner) throw new Error('Workspace not found.');
  const [customersResult, invoicesResult, estimatesResult, profileResult, subscriptionResult] = await Promise.all([
    supabase.from('customers').select('*').eq('user_id', dataOwner).eq('crm_archived', false).order('crm_updated_at', { ascending: false }),
    supabase.from('invoices').select('*, invoice_items(*)').eq('user_id', dataOwner).order('created_at', { ascending: false }),
    supabase.from('estimates').select('*, estimate_items(*)').eq('user_id', dataOwner).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,email,full_name,plan').eq('id', dataOwner).maybeSingle(),
    supabase.rpc('get_workspace_subscription_summary'),
  ]);
  for (const result of [customersResult, invoicesResult, estimatesResult, profileResult, subscriptionResult]) if (result.error) throw result.error;
  const sub = Array.isArray(subscriptionResult.data) ? subscriptionResult.data[0] : subscriptionResult.data;
  const customers = (customersResult.data || []).map((row) => ({
    id: row.id, name: row.name, company: row.company || '', email: row.email || '', phone: row.phone || '',
    status: crmFromDb[row.crm_status] || 'lead', notes: row.crm_notes || row.notes || '', source: row.crm_source || '',
    followUp: row.crm_follow_up || '', nextAction: row.crm_next_action || '', createdAt: row.created_at, updatedAt: row.crm_updated_at || row.created_at,
  }));
  const invoices = (invoicesResult.data || []).map(mapInvoiceRow);
  const estimates = (estimatesResult.data || []).map(mapEstimateRow);
  return { customers, invoices, estimates, profile: profileResult.data || null, subscription: sub || null, workspace: await getWorkspaceContext() };
}

export async function getCompanySettings(userId) {
  const dataOwner = await ownerId(userId);
  const { data, error } = await supabase.from('company_settings').select('*').eq('user_id', dataOwner).maybeSingle();
  if (error) throw error;
  if (!data) return { companyName:'',companyEmail:'',phone:'',address:'',city:'',postalCode:'',country:'',taxNumber:'',defaultCurrency:'USD',defaultTax:0,invoicePrefix:'INV-',estimatePrefix:'EST-',paymentTermsDays:14,reminderScheduleDays:[0,7,14],bankAccount:'',iban:'',bicSwift:'',paymentReference:'',paymentDetails:'' };
  return {
    id:data.id, companyName:data.business_name||data.company_name||'', companyEmail:data.business_email||data.company_email||'', phone:data.phone||'',
    address:data.business_address||data.address||'', city:data.city||'', postalCode:data.postal_code||'', country:data.country||'', taxNumber:data.business_tax_id||data.tax_number||'',
    defaultCurrency:data.default_currency||'USD', defaultTax:Number(data.default_tax||0), invoicePrefix:data.invoice_prefix||'INV-', estimatePrefix:data.estimate_prefix||'EST-',
    paymentTermsDays:Number(data.payment_terms_days??14), reminderScheduleDays:Array.isArray(data.reminder_schedule_days)?data.reminder_schedule_days:[0,7,14],
    bankAccount:data.bank_account||'', iban:data.iban||'', bicSwift:data.bic_swift||'', paymentReference:data.payment_reference||'', paymentDetails:data.payment_details||'',
  };
}

export async function saveCompanySettings(userId, settings) {
  const dataOwner = await ownerId(userId);
  const context = await getWorkspaceContext();
  if (!context?.canAdmin) throw new Error('Admin access is required to change business settings.');
  const payload = {
    user_id:dataOwner, company_name:settings.companyName||null, business_name:settings.companyName||null, company_email:settings.companyEmail||null,
    business_email:settings.companyEmail||null, phone:settings.phone||null, address:settings.address||null, business_address:settings.address||null,
    city:settings.city||null, postal_code:settings.postalCode||null, country:settings.country||null, tax_number:settings.taxNumber||null,
    business_tax_id:settings.taxNumber||null, default_currency:settings.defaultCurrency||'USD', default_tax:Number(settings.defaultTax||0), invoice_prefix:settings.invoicePrefix||'INV-',
    estimate_prefix:settings.estimatePrefix||'EST-', payment_terms_days:Math.max(0,Number(settings.paymentTermsDays??14)),
    ...(Array.isArray(settings.reminderScheduleDays)?{reminder_schedule_days:settings.reminderScheduleDays}:{}), bank_account:settings.bankAccount||null,
    iban:settings.iban||'', bic_swift:settings.bicSwift||'', payment_reference:settings.paymentReference||'', payment_details:settings.paymentDetails||'',
    invoice_onboarding_completed:true, onboarding_completed_at:new Date().toISOString(),
  };
  const { data, error } = await supabase.from('company_settings').upsert(payload,{onConflict:'user_id'}).select('*').single();
  if (error) throw error;
  return data;
}

export async function saveCustomer(userId, customer) {
  await requireWriteAccess();
  const dataOwner = await ownerId(userId);
  const payload = { user_id:dataOwner,name:customer.name,company:customer.company||null,email:customer.email||null,phone:customer.phone||null,notes:customer.notes||null,crm_enabled:true,crm_status:crmToDb[customer.status]||'lead',crm_notes:customer.notes||null,crm_source:customer.source||null,crm_follow_up:customer.followUp||null,crm_next_action:customer.nextAction||null,crm_updated_at:new Date().toISOString() };
  const query = customer.persisted ? supabase.from('customers').update(payload).eq('id',customer.id).eq('user_id',dataOwner) : supabase.from('customers').insert(payload);
  const { data,error } = await query.select('*').single(); if(error)throw error;
  return {...customer,id:data.id,persisted:true,source:data.crm_source||customer.source||'',followUp:data.crm_follow_up||customer.followUp||'',nextAction:data.crm_next_action||customer.nextAction||'',createdAt:data.created_at,updatedAt:data.crm_updated_at||data.created_at};
}

async function shouldUseAutomaticNumber(kind, requested, dataOwner) {
  const isInvoice = kind === 'invoice';
  const prefixColumn = isInvoice ? 'invoice_prefix' : 'estimate_prefix';
  const nextColumn = isInvoice ? 'next_invoice_number' : 'next_estimate_number';
  const table = isInvoice ? 'invoices' : 'estimates';
  const numberColumn = isInvoice ? 'invoice_number' : 'estimate_number';
  const fallback = isInvoice ? 'INV-' : 'EST-';
  const { data: settings, error: settingsError } = await supabase.from('company_settings').select(`${prefixColumn},${nextColumn}`).eq('user_id', dataOwner).maybeSingle();
  if (settingsError) throw settingsError;
  const prefix = String(settings?.[prefixColumn] || fallback).trim();
  const next = Math.max(1, Number(settings?.[nextColumn] || 1));
  const value = String(requested || '').trim();
  if (!value) return true;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = value.match(new RegExp(`^${escaped}(\\d+)$`));
  if (!match) return false;
  const suffix = Number(match[1]);
  if (suffix === next) return true;
  const { data: duplicate, error: duplicateError } = await supabase.from(table).select('id').eq('user_id', dataOwner).eq(numberColumn, value).limit(1);
  if (duplicateError) throw duplicateError;
  if ((duplicate || []).length) return true;
  const { data: recent, error: recentError } = await supabase.from(table).select(numberColumn).eq('user_id', dataOwner).order('created_at', { ascending: false }).limit(200);
  if (recentError) throw recentError;
  let maxSuffix = 0;
  for (const row of recent || []) {
    const candidate = String(row[numberColumn] || '').match(new RegExp(`^${escaped}(\\d+)$`));
    if (candidate) maxSuffix = Math.max(maxSuffix, Number(candidate[1]));
  }
  return suffix === maxSuffix + 1;
}

export async function saveInvoice(userId, invoice) {
  await requireWriteAccess();
  const dataOwner = await ownerId(userId);
  const autoNumber = invoice.persisted ? false : await shouldUseAutomaticNumber('invoice', invoice.number, dataOwner);
  const { data, error } = await supabase.rpc('save_invoice_with_items', {
    p_invoice_id: invoice.persisted ? invoice.id : null,
    p_customer_id: invoice.customerId || null,
    p_requested_number: invoice.number || null,
    p_auto_number: autoNumber,
    p_status: invoice.status || 'draft',
    p_currency: invoice.currency || 'USD',
    p_issue_date: invoice.issueDate || null,
    p_due_date: invoice.dueDate || null,
    p_tax_rate: Number(invoice.taxRate || 0),
    p_lines: (invoice.lines || []).map((line) => ({ description: line.description || 'Service', qty: Number(line.qty || 0), rate: Number(line.rate || 0) })),
    p_notes: invoice.notes || null,
  });
  if (error) throw error;
  const savedMeta = Array.isArray(data) ? data[0] : data;
  if (!savedMeta?.invoice_id) throw new Error('Invoice save did not return an invoice id.');
  const { data: row, error: rowError } = await supabase.from('invoices').select('*, invoice_items(*)').eq('id', savedMeta.invoice_id).eq('user_id', dataOwner).single();
  if (rowError) throw rowError;
  return { ...mapInvoiceRow(row), persisted: true };
}

export async function saveEstimate(userId, estimate) {
  await requireWriteAccess();
  const dataOwner = await ownerId(userId);
  const autoNumber = estimate.persisted ? false : await shouldUseAutomaticNumber('estimate', estimate.number, dataOwner);
  const { data, error } = await supabase.rpc('save_estimate_with_items', {
    p_estimate_id: estimate.persisted ? estimate.id : null,
    p_customer_id: estimate.customerId || null,
    p_requested_number: estimate.number || null,
    p_auto_number: autoNumber,
    p_status: estimate.status || 'draft',
    p_currency: estimate.currency || 'USD',
    p_issue_date: estimate.issueDate || null,
    p_valid_until: estimate.validUntil || null,
    p_tax_rate: Number(estimate.taxRate || 0),
    p_lines: (estimate.lines || []).map((line) => ({ description: line.description || 'Service', qty: Number(line.qty || 0), rate: Number(line.rate || 0) })),
    p_notes: estimate.notes || null,
  });
  if (error) throw error;
  const savedMeta = Array.isArray(data) ? data[0] : data;
  if (!savedMeta?.estimate_id) throw new Error('Estimate save did not return an estimate id.');
  const { data: row, error: rowError } = await supabase.from('estimates').select('*, estimate_items(*)').eq('id', savedMeta.estimate_id).eq('user_id', dataOwner).single();
  if (rowError) throw rowError;
  return { ...mapEstimateRow(row), persisted: true };
}

export async function convertEstimateToInvoice(userId, estimate) {
  await requireWriteAccess();
  if (estimate.convertedInvoiceId || estimate.status === 'converted') throw new Error('Estimate has already been converted.');
  const dataOwner = await ownerId(userId);
  const { data, error } = await supabase.rpc('convert_estimate_to_invoice', { p_estimate_id: estimate.id });
  if (error) throw error;
  const invoiceId = Array.isArray(data) ? data[0] : data;
  if (!invoiceId) throw new Error('Estimate conversion did not return an invoice id.');
  const { data: row, error: rowError } = await supabase.from('invoices').select('*, invoice_items(*)').eq('id', invoiceId).eq('user_id', dataOwner).single();
  if (rowError) throw rowError;
  return { ...mapInvoiceRow(row), persisted: true };
}

export async function markInvoicePaid(userId,invoiceId){await requireWriteAccess();const dataOwner=await ownerId(userId);const{error}=await supabase.from('invoices').update({status:'paid',paid_date:new Date().toISOString().slice(0,10),updated_at:new Date().toISOString()}).eq('id',invoiceId).eq('user_id',dataOwner);if(error)throw error;}
