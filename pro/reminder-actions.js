import { getCompanySettings, getSession, supabase } from './backend.js';

let session = null;
let settings = null;

function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function addDays(dateString,days){const d=new Date(`${dateString}T12:00:00`);d.setDate(d.getDate()+Number(days||0));return d.toISOString().slice(0,10);}

async function ensureContext(){if(!session)session=await getSession();if(!session?.user?.id)throw new Error('Sign in first.');if(!settings)settings=await getCompanySettings(session.user.id);}

export async function scheduleInvoiceReminders(invoiceId,dueDate){
  await ensureContext();
  if(!dueDate)return;
  const schedule=(settings?.reminderScheduleDays||[0,7,14]).map(Number).filter((n)=>Number.isFinite(n)&&n>=0&&n<=365);
  const {error:deleteError}=await supabase.from('reminder_queue').delete().eq('invoice_id',invoiceId).eq('user_id',session.user.id).eq('status','ready');
  if(deleteError)throw deleteError;
  if(!schedule.length)return;
  const rows=[...new Set(schedule)].sort((a,b)=>a-b).map((day)=>({user_id:session.user.id,invoice_id:invoiceId,reminder_day:day,due_on:addDays(dueDate,day),status:'ready'}));
  const {error}=await supabase.from('reminder_queue').insert(rows);
  if(error)throw error;
}

async function fetchInvoice(id){const {data,error}=await supabase.from('invoices').select('id,invoice_number,status,due_date,customer_id').eq('id',id).eq('user_id',session.user.id).maybeSingle();if(error)throw error;if(!data)throw new Error('Invoice not found.');const customer=data.customer_id?await supabase.from('customers').select('name,email').eq('id',data.customer_id).eq('user_id',session.user.id).maybeSingle():{data:null,error:null};if(customer.error)throw customer.error;return{invoice:data,customer:customer.data};}

async function sendReminder(id){
  await ensureContext();
  const {invoice,customer}=await fetchInvoice(id);
  if(!customer?.email)throw new Error('Customer has no email address.');
  const subject=`Payment reminder for ${invoice.invoice_number}`;
  const html=`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px"><h2>${esc(subject)}</h2><p>Hello ${esc(customer.name||'there')},</p><p>This is a friendly reminder that invoice <strong>${esc(invoice.invoice_number)}</strong> is due${invoice.due_date?` on ${esc(invoice.due_date)}`:''}.</p><p>Please disregard this message if payment has already been made.</p><p>If you have any questions, simply reply to this email.</p></div>`;
  const {data,error}=await supabase.functions.invoke('send-invoice-message',{body:{invoiceId:id,kind:'reminder',recipient:customer.email,subject,html}});
  if(error)throw error;if(!data?.sent)throw new Error(data?.error||'Could not send reminder.');
  return data;
}

function injectButtons(root=document){root.querySelectorAll('[data-edit-invoice]').forEach((edit)=>{const id=edit.dataset.editInvoice;const row=edit.closest('tr');if(!row||row.querySelector(`[data-reminder-invoice="${id}"]`))return;const status=row.querySelector('.status')?.textContent?.trim().toLowerCase()||'';if(!['sent','overdue'].includes(status))return;const cell=edit.parentElement;const button=document.createElement('button');button.type='button';button.className='mini-btn';button.dataset.reminderInvoice=id;button.textContent=status==='overdue'?'Send reminder':'Reminder';cell.appendChild(document.createTextNode(' '));cell.appendChild(button);});}

document.addEventListener('click',async(event)=>{const button=event.target.closest('[data-reminder-invoice]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();button.disabled=true;const original=button.textContent;button.textContent='Sending…';try{await sendReminder(button.dataset.reminderInvoice);button.textContent='Sent';setTimeout(()=>window.location.reload(),700);}catch(error){console.error(error);alert(error?.message||'Could not send reminder.');button.disabled=false;button.textContent=original;}},true);

const observer=new MutationObserver(()=>injectButtons());observer.observe(document.body,{childList:true,subtree:true});injectButtons();

(async()=>{try{session=await getSession();if(session?.user?.id)settings=await getCompanySettings(session.user.id);}catch(error){console.error('Reminder actions init failed',error);}})();

window.SoloBizKitReminders={scheduleInvoiceReminders};
