import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = 'https://eaqddwqprhofpizbpziq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9PpiWr0duM-ve-mcqkCysg_BpX58a9O';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
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
  const [customersResult, invoicesResult, profileResult, subscriptionResult] = await Promise.all([
    supabase.from('customers').select('*').eq('user_id', userId).eq('crm_archived', false).order('crm_updated_at', { ascending: false }),
    supabase.from('invoices').select('*, invoice_items(*)').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,email,full_name,plan').eq('id', userId).maybeSingle(),
    supabase.from('subscriptions').select('status,plan,current_period_end,cancel_at_period_end').eq('user_id', userId).maybeSingle(),
  ]);

  for (const result of [customersResult, invoicesResult, profileResult, subscriptionResult]) {
    if (result.error) throw result.error;
  }

  const customers = (customersResult.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company || '',
    email: row.email || '',
    phone: row.phone || '',
    status: crmFromDb[row.crm_status] || 'lead',
    notes: row.crm_notes || row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.crm_updated_at || row.created_at,
  }));

  const invoices = (invoicesResult.data || []).map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    number: row.invoice_number,
    issueDate: row.issue_date,
    dueDate: row.due_date || '',
    status: row.status,
    currency: row.currency,
    taxRate: Number(row.invoice_items?.[0]?.tax_rate || 0),
    lines: [...(row.invoice_items || [])]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ description: item.description, qty: Number(item.quantity), rate: Number(item.unit_price) })),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    customers,
    invoices,
    profile: profileResult.data || null,
    subscription: subscriptionResult.data || null,
  };
}

export async function saveCustomer(userId, customer) {
  const payload = {
    user_id: userId,
    name: customer.name,
    company: customer.company || null,
    email: customer.email || null,
    phone: customer.phone || null,
    notes: customer.notes || null,
    crm_enabled: true,
    crm_status: crmToDb[customer.status] || 'lead',
    crm_notes: customer.notes || null,
    crm_updated_at: new Date().toISOString(),
  };

  const query = customer.persisted
    ? supabase.from('customers').update(payload).eq('id', customer.id).eq('user_id', userId)
    : supabase.from('customers').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return {
    ...customer,
    id: data.id,
    persisted: true,
    createdAt: data.created_at,
    updatedAt: data.crm_updated_at || data.created_at,
  };
}

export async function saveInvoice(userId, invoice) {
  const subtotal = invoice.lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.rate || 0), 0);
  const taxTotal = subtotal * (Number(invoice.taxRate || 0) / 100);
  const total = subtotal + taxTotal;
  const payload = {
    user_id: userId,
    customer_id: invoice.customerId || null,
    invoice_number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate || null,
    subtotal,
    tax_total: taxTotal,
    discount_total: 0,
    discount_rate: 0,
    total,
    notes: invoice.notes || null,
    language: 'en',
    document_type: 'invoice',
    vat_mode: 'standard',
    updated_at: new Date().toISOString(),
    paid_date: invoice.status === 'paid' ? new Date().toISOString().slice(0, 10) : null,
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

  const items = invoice.lines.map((line, position) => ({
    invoice_id: saved.id,
    user_id: userId,
    description: line.description || 'Service',
    quantity: Number(line.qty || 1),
    unit_price: Number(line.rate || 0),
    tax_rate: Number(invoice.taxRate || 0),
    discount: 0,
    position,
  }));
  const { error: itemsError } = await supabase.from('invoice_items').insert(items);
  if (itemsError) throw itemsError;

  return { ...invoice, id: saved.id, persisted: true, createdAt: saved.created_at, updatedAt: saved.updated_at };
}

export async function markInvoicePaid(userId, invoiceId) {
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('user_id', userId);
  if (error) throw error;
}
