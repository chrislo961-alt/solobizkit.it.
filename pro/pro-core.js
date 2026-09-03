export function calculateInvoice(invoice = {}) {
  const lines = Array.isArray(invoice.lines) ? invoice.lines : [];
  const subtotal = lines.reduce((sum, line) => {
    const qty = Number(line.qty) || 0;
    const rate = Number(line.rate) || 0;
    return sum + qty * rate;
  }, 0);
  const taxRate = Math.max(0, Number(invoice.taxRate) || 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export function nextInvoiceNumber(invoices = []) {
  const highest = invoices.reduce((max, invoice) => {
    const match = String(invoice.number || '').match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);
  const rawPrefix = typeof window !== 'undefined' && window.__solobizkitInvoicePrefix ? String(window.__solobizkitInvoicePrefix) : 'INV-';
  const prefix = rawPrefix.endsWith('-') ? rawPrefix : `${rawPrefix}-`;
  return `${prefix}${highest + 1}`;
}

export function normalizeInvoiceStatus(invoice, today = new Date()) {
  const status = invoice?.status || 'draft';
  if (status === 'paid' || status === 'draft') return status;
  if (!invoice?.dueDate) return status;
  const due = new Date(`${invoice.dueDate}T23:59:59`);
  return due < today ? 'overdue' : status;
}

export function customerOutstanding(customerId, invoices = [], today = new Date()) {
  return invoices
    .filter((invoice) => invoice.customerId === customerId)
    .filter((invoice) => normalizeInvoiceStatus(invoice, today) !== 'paid')
    .filter((invoice) => normalizeInvoiceStatus(invoice, today) !== 'draft')
    .reduce((sum, invoice) => sum + calculateInvoice(invoice).total, 0);
}

export function money(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value) || 0);
  } catch {
    return `${(Number(value) || 0).toFixed(2)} ${currency}`;
  }
}
