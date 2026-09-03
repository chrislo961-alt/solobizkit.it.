import { getCompanySettings, getSession, supabase } from '../backend.js';

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + Math.max(0, Number(days || 0)));
  return date.toISOString().slice(0, 10);
}

async function applyPaymentTerms(estimateId) {
  const session = await getSession();
  if (!session?.user?.id) return;
  const settings = await getCompanySettings(session.user.id);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data: estimate, error } = await supabase.from('estimates').select('converted_invoice_id').eq('id', estimateId).eq('user_id', session.user.id).maybeSingle();
    if (error) throw error;
    if (estimate?.converted_invoice_id) {
      const { data: invoice, error: invoiceError } = await supabase.from('invoices').select('id,issue_date,due_date').eq('id', estimate.converted_invoice_id).eq('user_id', session.user.id).maybeSingle();
      if (invoiceError) throw invoiceError;
      if (invoice && !invoice.due_date && invoice.issue_date) {
        const dueDate = addDays(invoice.issue_date, settings.paymentTermsDays || 14);
        const { error: updateError } = await supabase.from('invoices').update({ due_date: dueDate, updated_at: new Date().toISOString() }).eq('id', invoice.id).eq('user_id', session.user.id);
        if (updateError) throw updateError;
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-convert]');
  if (!button?.dataset.convert) return;
  const estimateId = button.dataset.convert;
  setTimeout(() => applyPaymentTerms(estimateId).catch((error) => console.error('Could not apply payment terms to converted invoice', error)), 50);
});
