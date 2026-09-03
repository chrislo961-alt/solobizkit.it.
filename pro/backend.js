import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = 'https://eaqddwqprhofpizbpziq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9PpiWr0duM-ve-mcqkCysg_BpX58a9O';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const crmToDb = { lead: 'lead', active: 'contacted', client: 'won' };
const crmFromDb = { lead: 'lead', contacted: 'active', proposal: 'active', won: 'client', lost: 'lead' };

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/pro/` },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadWorkspace(userId) {
  const [customersResult, invoicesResult, estimatesResult, profileResult, subscriptionResult] = await Promise.all([
    supabase.from('customers').select('*').eq('user_id', userId).eq('crm_archived', false).order('crm_updated_at', { ascending: false }),
    supabase.from('invoices').select('*, invoice_items(*)').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('estimates').select('*, estimate_items(*)').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,email,full_name,plan').eq('id', userId).maybeSingle(),
    supabase.from('subscriptions').select('status,plan,current_period_end,cancel_at_period_end').eq('user_id', userId).maybeSingle(),
  ]);

  for (const result of [customersResult, invoicesResult, estimatesResult, profileResult, subscriptionResult]) {
    if (result.error) throw result.error;
  }

  const customers = (customersResult.data || []).map((row) => ({
    id: row.id, name: row.name, company: row.company || '', email: row.email || '', phone: row.phone || '',
    status: crmFromDb[row.crm_status] || 'lead', notes: row.crm_notes || row.notes || '', createdAt: row.created_at,
    updatedAt: row.crm_updated_at || row.created_at,
  }));

  const invoices = (invoicesResult.data || []).map((row) => ({
    id: row.id, customerId: row.customer_id, number: row.invoice_number, issueDate: row.issue_date, dueDate: row.due_date || '',
    status: row.status, currency: row.currency, taxRate: Number(row.invoice_items?.[0]?.tax_rate || 0),
    lines: [...(row.invoice_items || [])].sort((a, b) => a.position - b.position).map((item) => ({ description: item.description, qty: Number(item.quantity), rate: Number(item.unit_price) })),
    notes: row.notes || '', createdAt: row.created_at, updatedAt: row.updated_at,
  }));

  const estimates = (estimatesResult.data || []).map((row) => ({
    id: row.id, customerId: row.customer_id, number: row.estimate_number, issueDate: row.issue_date, validUntil: row.valid_until || '',
    status: row.status, currency: row.currency, taxRate: Number(row.estimate_items?.[0]?.tax_rate || 0), convertedInvoiceId: row.converted_invoice_id,
    lines: [...(row.estimate_items || [])].sort((a, b) => a.position - b.position).map((item) => ({ description: item.description, qty: Number(item.quantity), rate: Number(item.unit_price) })),
    notes: row.notes || '', createdAt: row.created_at, updatedAt: row.updated_at,
  }));

  return { customers, invoices, estimates, profile: profileResult.data || null, subscription: subscriptionResult.data || null };
}

export async function getCompanySettings(userId) {
  const { data, error } = await supabase.from('company_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return {
    companyName: '', companyEmail: '', phone: '', address: '', city: '', postalCode: '', country: '', taxNumber: '',
    defaultCurrency: 'USD', defaultTax: 0, invoicePrefix: 'INV', estimatePrefix: 'EST-', paymentTermsDays: 14,
    reminderScheduleDays: [0, 7, 14], bankAccount: '', iban: '', bicSwift: '', paymentReference: '', paymentDetails: '',
    notifyEstimateResponses: true, notifyInvoicePaid: true,
  };
  return {
    id: data.id,
    companyName: data.business_name || data.company_name || '',
    companyEmail: data.business_email || data.company_email || '',
    phone: data.phone || '',
    address: data.business_address || data.address || '',
    city: data.city || '',
    postalCode: data.postal_code || '',
    country: data.country || '',
    taxNumber: data.business_tax_id || data.tax_number || '',
    defaultCurrency: data.default_currency || 'USD',
    defaultTax: Number(data.default_tax || 0),
    invoicePrefix: data.invoice_prefix || 'INV',
    estimatePrefix: data.estimate_prefix || 'EST-',
    paymentTermsDays: Number(data.payment_terms_days ?? 14),
    reminderScheduleDays: Array.isArray(data.reminder_schedule_days) ? data.reminder_schedule_days : [0, 7, 14],
    bankAccount: data.bank_account || '', iban: data.iban || '', bicSwift: data.bic_swift || '',
    paymentReference: data.payment_reference || '', paymentDetails: data.payment_details || '',
    notifyEstimateResponses: data.notify_estimate_responses !== false,
    notifyInvoicePaid: data.notify_invoice_paid !== false,
  };
}

export async function saveCompanySettings(userId, settings) {
  const payload = {
    user_id: userId,
    company_name: settings.companyName || null,
    business_name: settings.companyName || null,
    company_email: settings.companyEmail || null,
    business_email: settings.companyEmail || null,
    phone: settings.phone || null,
    address: settings.address || null,
    business_address: settings.address || null,
    city: settings.city || null,
    postal_code: settings.postalCode || null,
    country: settings.country || null,
    tax_number: settings.taxNumber || null,
    business_tax_id: settings.taxNumber || null,
    default_currency: settings.defaultCurrency || 'USD',
    default_tax: Number(settings.defaultTax || 0),
    invoice_prefix: settings.invoicePrefix || 'INV',
    estimate_prefix: settings.estimatePrefix || 'EST-',
    payment_terms_days: Math.max(0, Number(settings.paymentTermsDays ?? 14)),
    ...(Array.isArray(settings.reminderScheduleDays) ? { reminder_schedule_days: settings.reminderScheduleDays } : {}),
    bank_account: settings.bankAccount || null,
    iban: settings.iban || null,
    bic_swift: settings.bicSwift || null,
    payment_reference: settings.paymentReference || null,
    payment_details: settings.paymentDetails || null,
    notify_estimate_responses: settings.notifyEstimateResponses !== false,
    notify_invoice_paid: settings.notifyInvoicePaid !== false,
    invoice_onboarding_completed: true,
    onboarding_completed_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('company_settings').upsert(payload, { onConflict: 'user_id' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function saveCustomer(userId, customer) {
  const payload = {
    user_id: userId, name: customer.name, company: customer.company || null, email: customer.email || null, phone: customer.phone || null,
    notes: customer.notes || null, crm_enabled: true, crm_status: crmToDb[customer.status] || 'lead', crm_notes: customer.notes || null,
    crm_updated_at: new Date().toISOString(),
  };
  const query = customer.persisted
    ? supabase.from('customers').update(payload).eq('id', customer.id).eq('user_id', userId)
    : supabase.from('customers').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return { ...customer, id: data.id, persisted: true, createdAt: data.created_at, updatedAt: data.crm_updated_at || data.created_at };
}

function totalsFromLines(lines, taxRate) {
  const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.rate || 0), 0);
  const taxTotal = subtotal * (Number(taxRate || 0) / 100);
  return { subtotal, taxTotal, total: subtotal + taxTotal };
}

function addDaysISO(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + Math.max(0, Number(days ?? 0)));
  return date.toISOString().slice(0, 10);
}

export async function saveInvoice(userId, invoice) {
  const { subtotal, taxTotal, total } = totalsFromLines(invoice.lines, invoice.taxRate);
  const payload = {
    user_id: userId, customer_id: invoice.customerId || null, invoice_number: invoice.number, status: invoice.status,
    currency: invoice.currency, issue_date: invoice.issueDate, due_date: invoice.dueDate || null, subtotal, tax_total: taxTotal,
    discount_total: 0, discount_rate: 0, total, notes: invoice.notes || null, language: 'en', document_type: 'invoice', vat_mode: 'standard',
    updated_at: new Date().toISOString(), paid_date: invoice.status === 'paid' ? new Date().toISOString().slice(0, 10) : null,
  };
  let saved;
  if (invoice.persisted) {
    const { data, error } = await supabase.from('invoices').update(payload).eq('id', invoice.id).eq('user_id', userId).select('*').single();
    if (error) throw error;
    saved = data;
    const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id).eq('user_id', userId);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase.from('invoices').insert(payload).select('*').single();
    if (error) throw error;
    saved = data;
  }
  const items = invoice.lines.map((line, position) => ({ invoice_id: saved.id, user_id: userId, description: line.description || 'Service', quantity: Number(line.qty || 1), unit_price: Number(line.rate || 0), tax_rate: Number(invoice.taxRate || 0), discount: 0, position }));
  const { error: itemsError } = await supabase.from('invoice_items').insert(items);
  if (itemsError) throw itemsError;
  return { ...invoice, id: saved.id, persisted: true, createdAt: saved.created_at, updatedAt: saved.updated_at };
}

export async function saveEstimate(userId, estimate) {
  const { subtotal, taxTotal, total } = totalsFromLines(estimate.lines, estimate.taxRate);
  const payload = {
    user_id: userId, customer_id: estimate.customerId || null, estimate_number: estimate.number, status: estimate.status,
    currency: estimate.currency, language: 'en', issue_date: estimate.issueDate, valid_until: estimate.validUntil || null,
    subtotal, tax_total: taxTotal, discount_total: 0, discount_rate: 0, total, notes: estimate.notes || null,
    vat_mode: 'standard', updated_at: new Date().toISOString(),
  };
  let saved;
  if (estimate.persisted) {
    const { data, error } = await supabase.from('estimates').update(payload).eq('id', estimate.id).eq('user_id', userId).select('*').single();
    if (error) throw error;
    saved = data;
    const { error: deleteError } = await supabase.from('estimate_items').delete().eq('estimate_id', estimate.id).eq('user_id', userId);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase.from('estimates').insert(payload).select('*').single();
    if (error) throw error;
    saved = data;
  }
  const items = estimate.lines.map((line, position) => ({ estimate_id: saved.id, user_id: userId, description: line.description || 'Service', quantity: Number(line.qty || 1), unit_price: Number(line.rate || 0), tax_rate: Number(estimate.taxRate || 0), position }));
  const { error: itemsError } = await supabase.from('estimate_items').insert(items);
  if (itemsError) throw itemsError;
  return { ...estimate, id: saved.id, persisted: true, createdAt: saved.created_at, updatedAt: saved.updated_at };
}

export async function convertEstimateToInvoice(userId, estimate, invoiceNumber) {
  if (estimate.convertedInvoiceId || estimate.status === 'converted') throw new Error('Estimate has already been converted.');
  const settings = await getCompanySettings(userId);
  const issueDate = new Date().toISOString().slice(0, 10);
  const invoice = await saveInvoice(userId, {
    customerId: estimate.customerId, number: invoiceNumber, issueDate,
    dueDate: addDaysISO(issueDate, settings.paymentTermsDays ?? 14), status: 'draft',
    currency: estimate.currency, taxRate: estimate.taxRate, lines: estimate.lines, notes: estimate.notes || '', persisted: false,
  });
  const { error } = await supabase.from('estimates').update({ status: 'converted', converted_invoice_id: invoice.id, updated_at: new Date().toISOString() }).eq('id', estimate.id).eq('user_id', userId);
  if (error) throw error;
  return invoice;
}

export async function markInvoicePaid(userId, invoiceId) {
  const { error } = await supabase.from('invoices').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }).eq('id', invoiceId).eq('user_id', userId);
  if (error) throw error;
}
