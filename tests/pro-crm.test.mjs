import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoice, customerOutstanding, nextInvoiceNumber, normalizeInvoiceStatus } from '../pro/pro-core.js';

test('calculates subtotal, tax and total', () => {
  const result = calculateInvoice({
    taxRate: 25,
    lines: [
      { qty: 2, rate: 100 },
      { qty: 1, rate: 50 }
    ]
  });
  assert.equal(result.subtotal, 250);
  assert.equal(result.tax, 62.5);
  assert.equal(result.total, 312.5);
});

test('generates the next invoice number', () => {
  assert.equal(nextInvoiceNumber([{ number: 'INV-1003' }, { number: 'INV-1012' }]), 'INV-1013');
});

test('marks sent invoices overdue after due date', () => {
  const status = normalizeInvoiceStatus({ status: 'sent', dueDate: '2026-08-31' }, new Date('2026-09-03T12:00:00Z'));
  assert.equal(status, 'overdue');
});

test('keeps drafts as drafts even after due date', () => {
  const status = normalizeInvoiceStatus({ status: 'draft', dueDate: '2026-08-31' }, new Date('2026-09-03T12:00:00Z'));
  assert.equal(status, 'draft');
});

test('customer outstanding excludes drafts and paid invoices', () => {
  const invoices = [
    { customerId: 'c1', status: 'sent', dueDate: '2026-09-30', taxRate: 0, lines: [{ qty: 1, rate: 200 }] },
    { customerId: 'c1', status: 'draft', taxRate: 0, lines: [{ qty: 1, rate: 500 }] },
    { customerId: 'c1', status: 'paid', taxRate: 0, lines: [{ qty: 1, rate: 300 }] },
    { customerId: 'c2', status: 'sent', taxRate: 0, lines: [{ qty: 1, rate: 900 }] }
  ];
  assert.equal(customerOutstanding('c1', invoices, new Date('2026-09-03T12:00:00Z')), 200);
});
