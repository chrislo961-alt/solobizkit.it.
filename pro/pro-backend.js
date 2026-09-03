import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = 'https://eaqddwqprhofpizbpziq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9PpiWr0duM-ve-mcqkCysg_BpX58a9O';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const crmToUi = { lead: 'lead', contacted: 'active', proposal: 'active', won: 'client', lost: 'lead' };
const uiToCrm = { lead: 'lead', active: 'contacted', client: 'won' };

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw error;
  return data?.user || null;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session?.user || null));
}

function invoiceTotals(invoice) {
  const subtotal = (invoice.lines || []).reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.rate) || 0), 0);
  const tax = subtotal * ((Number(invoice.taxRate) || 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export async function loadWorkspace() {
  const [{ data: customers, error: customerError }, { data: invoices, error: invoiceError }] = await Promise.all([
    supabase.from('customers').select('*').order('created_at', { ascending: false }),
    supabase.from('invoices').select('*, invoice_items(*)').order('created_at', { ascending: false })
  ]);
  if (customerError) throw customerError;
  if (invoiceError) throw invoiceError;

  return {
    customers: (customers || []).map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company || '',
      email: c.email || '',
      phone: c.phone || '',
      status: crmToUi[c.crm_status] || 'lead',
      notes: c.crm_notes || c.notes || '',
      createdAt: c.created_at,
      updatedAt: c.crm_updated_at || c.created_at
    })),
    invoices: (invoices || []).map((i) => ({
      id: i.id,
      customerId: i.customer_id,
      number: i.invoice_number,
      issueDate: i.issue_date || '',
      dueDate: i.due_date || '',
      status: i.status,
      currency: i.currency,
      taxRate: Number(i.invoice_items?.[0]?.tax_rate ?? (i.subtotal ? (Number(i.tax_total) / Number(i.subtotal)) * 100 : 0)) || 0,
      lines: [...(i.invoice_items || [])].sort((a, b) => a.position - b.position).map((line) => ({
        description: line.description,
        qty: Number(line.quantity),
        rate: Number(line.unit_price)
      })),
      notes: i.notes || '',
      createdAt: i.created_at,
      updatedAt: i.updated_at
    })),
    settings: { currency: 'USD', taxRate: 0 }
  };
}

export async function upsertCustomer(customer, userId) {
  const payload = {
    id: customer.id,
    user_id: userId,
    name: customer.name,
    company: customer.company || null,
    email: customer.email || null,
    phone: customer.phone || null,
    notes: customer.notes || null,
    crm_enabled: true,
    crm_status: uiToCrm[customer.status] || 'lead',
    crm_notes: customer.notes || null,
    crm_updated_at: new Date().toISOString(),
    crm_archived: false
  };
  const { data, error } = await supabase.from('customers').upsert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function upsertInvoice(invoice, userId) {
  const totals = invoiceTotals(invoice);
  const payload = {
    id: invoice.id,
    user_id: userId,
    customer_id: invoice.customerId || null,
    invoice_number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate || null,
    subtotal: totals.subtotal,
    tax_total: totals.tax,
    discount_total: 0,
    discount_rate: 0,
    total: totals.total,
    notes: invoice.notes || null,
    language: 'en',
    document_type: 'invoice',
    vat_mode: Number(invoice.taxRate) > 0 ? 'standard' : 'no_vat',
    paid_date: invoice.status === 'paid' ? new Date().toISOString().slice(0, 10) : null,
    sent_date: ['sent', 'overdue', 'paid'].includes(invoice.status) ? (invoice.issueDate || new Date().toISOString().slice(0, 10)) : null,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('invoices').upsert(payload);
  if (error) throw error;

  const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);
  if (deleteError) throw deleteError;

  const items = (invoice.lines || []).filter((line) => String(line.description || '').trim() && Number(line.qty) > 0).map((line, position) => ({
    invoice_id: invoice.id,
    user_id: userId,
    description: String(line.description).trim(),
    quantity: Number(line.qty),
    unit_price: Math.max(0, Number(line.rate) || 0),
    tax_rate: Math.max(0, Math.min(100, Number(invoice.taxRate) || 0)),
    discount: 0,
    position
  }));
  if (items.length) {
    const { error: itemError } = await supabase.from('invoice_items').insert(items);
    if (itemError) throw itemError;
  }
}

export async function updateInvoiceStatus(invoiceId, status) {
  const payload = { status, updated_at: new Date().toISOString() };
  if (status === 'paid') payload.paid_date = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('invoices').update(payload).eq('id', invoiceId);
  if (error) throw error;
}
