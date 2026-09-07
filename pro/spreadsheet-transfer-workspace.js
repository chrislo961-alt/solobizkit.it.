import { downloadSpreadsheetTemplate, previewSpreadsheetImport } from './spreadsheet-transfer.js';
import { getDataOwnerId, getSession, getWorkspaceContext, loadWorkspace, supabase } from './backend.js';

const SHEETJS_URL='https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
let sheetPromise=null;
const sheetJs=()=>sheetPromise||(sheetPromise=import(SHEETJS_URL));
const norm=(v='')=>String(v).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const num=(v,f=0)=>{const n=Number(String(v??'').trim().replace(/\s/g,'').replace(',','.').replace(/[^0-9.+-]/g,''));return Number.isFinite(n)?n:f};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,num(v,a)));
const contactStatus=s=>s==='client'?'won':s==='active'?'contacted':'lead';

async function ctx(write=false){
  const session=await getSession();
  if(!session?.user?.id)throw new Error('Sign in first.');
  const [workspace,ownerId]=await Promise.all([getWorkspaceContext(),getDataOwnerId()]);
  if(!workspace||!ownerId)throw new Error('Workspace not found.');
  if(write&&!workspace.canWrite)throw new Error('Editor access is required to import data.');
  return{session,workspace,ownerId};
}
async function chunks(table,rows,size=100){for(let i=0;i<rows.length;i+=size){const{error}=await supabase.from(table).insert(rows.slice(i,i+size));if(error)throw error;}}
const contactKey=r=>({email:String(r.email||'').trim().toLowerCase(),fallback:`${norm(r.name)}|${norm(r.company)}`});
const catalogKey=r=>({sku:String(r.sku||'').trim().toLowerCase(),fallback:`${norm(r.name)}|${String(r.currency||'').toUpperCase()}|${norm(r.unit)}`});

async function importContacts(ownerId,preview){
  const{data,error}=await supabase.from('customers').select('name,company,email').eq('user_id',ownerId);if(error)throw error;
  const emails=new Set(),names=new Set();for(const row of data||[]){const k=contactKey(row);if(k.email)emails.add(k.email);names.add(k.fallback)}
  const inserts=[];let duplicates=0;
  for(const row of preview.rows.slice(0,2000)){const k=contactKey(row);if((k.email&&emails.has(k.email))||names.has(k.fallback)){duplicates++;continue}if(k.email)emails.add(k.email);names.add(k.fallback);inserts.push({user_id:ownerId,name:row.name,company:row.company||null,email:row.email||null,phone:row.phone||null,notes:row.notes||null,crm_enabled:true,crm_archived:false,crm_status:contactStatus(row.status),crm_notes:row.notes||null,crm_source:row.source||'Excel import',crm_follow_up:row.followUp||null,crm_next_action:row.nextAction||null,crm_updated_at:new Date().toISOString()});}
  await chunks('customers',inserts);return{imported:inserts.length,duplicates,invalid:preview.invalidRows,limited:Math.max(0,preview.rows.length-2000)};
}
async function importCatalog(ownerId,preview){
  const[items,settings]=await Promise.all([supabase.from('products').select('name,sku,currency,unit').eq('user_id',ownerId),supabase.from('company_settings').select('default_currency').eq('user_id',ownerId).maybeSingle()]);
  if(items.error)throw items.error;if(settings.error)throw settings.error;const fallbackCurrency=String(settings.data?.default_currency||'USD').toUpperCase();
  const skus=new Set(),keys=new Set();for(const row of items.data||[]){const k=catalogKey(row);if(k.sku)skus.add(k.sku);keys.add(k.fallback)}
  const inserts=[];let duplicates=0;
  for(const source of preview.rows.slice(0,2000)){const row={...source,currency:/^[A-Z]{3}$/.test(source.currency||'')?source.currency:fallbackCurrency};const k=catalogKey(row);if((k.sku&&skus.has(k.sku))||keys.has(k.fallback)){duplicates++;continue}if(k.sku)skus.add(k.sku);keys.add(k.fallback);inserts.push({user_id:ownerId,name:row.name,description:row.description||null,kind:row.kind||'service',sku:row.sku||null,unit:row.unit||'item',unit_price:Math.max(0,num(row.unitPrice)),tax_rate:clamp(row.taxRate,0,100),currency:row.currency,active:row.active!==false,updated_at:new Date().toISOString()});}
  await chunks('products',inserts);return{imported:inserts.length,duplicates,invalid:preview.invalidRows,limited:Math.max(0,preview.rows.length-2000)};
}

export { previewSpreadsheetImport, downloadSpreadsheetTemplate };
export async function commitSpreadsheetImport(preview){if(!preview?.rows?.length)throw new Error('No importable rows were found.');const{ownerId}=await ctx(true);return preview.kind==='catalog'?importCatalog(ownerId,preview):importContacts(ownerId,preview);}

function col(n){let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s||'A'}
function append(XLSX,book,name,rows,headers){const ws=rows.length?XLSX.utils.json_to_sheet(rows,{header:headers}):XLSX.utils.aoa_to_sheet([headers]);ws['!autofilter']={ref:`A1:${col(headers.length)}1`};ws['!cols']=headers.map(h=>{let w=String(h).length+2;for(const r of rows.slice(0,250))w=Math.max(w,Math.min(44,String(r[h]??'').length+2));return{wch:Math.min(44,Math.max(10,w))}});XLSX.utils.book_append_sheet(book,ws,name.slice(0,31));}
function save(XLSX,book,filename){const bytes=XLSX.write(book,{type:'array',bookType:'xlsx',compression:true});const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)}
function totals(lines=[],tax=0){const subtotal=lines.reduce((s,l)=>s+num(l.qty)*num(l.rate),0);const vat=subtotal*num(tax)/100;return{subtotal,vat,total:subtotal+vat}}
function recurringTotal(p){const base=(p.recurring_invoice_items||[]).reduce((s,l)=>s+num(l.quantity)*num(l.unit_price)*(1+num(l.tax_rate)/100),0);return base*(1-clamp(p.discount_rate,0,100)/100)}

export async function exportWorkspaceExcel(){
  const{session,workspace,ownerId}=await ctx(false);
  const[data,products,recurring]=await Promise.all([loadWorkspace(ownerId),supabase.from('products').select('*').eq('user_id',ownerId).order('name'),supabase.from('recurring_invoice_profiles').select('*, recurring_invoice_items(*)').eq('user_id',ownerId).order('created_at',{ascending:false})]);
  if(products.error)throw products.error;if(recurring.error)throw recurring.error;
  const XLSX=await sheetJs();const book=XLSX.utils.book_new();book.Props={Title:'SoloBizKit data export',Subject:'Business data export',Author:'SoloBizKit'};
  const names=new Map(data.customers.map(c=>[c.id,c.name]));
  const contacts=data.customers.map(c=>({'Name':c.name,'Company':c.company,'Email':c.email,'Phone':c.phone,'Status':c.status,'Lead source':c.source,'Follow-up date':c.followUp,'Next action':c.nextAction,'Notes':c.notes}));
  const contactHeaders=['Name','Company','Email','Phone','Status','Lead source','Follow-up date','Next action','Notes'];append(XLSX,book,'Customers',contacts,contactHeaders);append(XLSX,book,'Leads',contacts.filter(r=>r.Status!=='client'),contactHeaders);
  append(XLSX,book,'Invoices',data.invoices.map(i=>{const t=totals(i.lines,i.taxRate);return{'Invoice number':i.number,'Customer':names.get(i.customerId)||'','Issue date':i.issueDate,'Due date':i.dueDate,'Status':i.status,'Currency':i.currency,'VAT / tax %':i.taxRate,'Subtotal':t.subtotal,'VAT / tax':t.vat,'Total':t.total,'Notes':i.notes}}),['Invoice number','Customer','Issue date','Due date','Status','Currency','VAT / tax %','Subtotal','VAT / tax','Total','Notes']);
  append(XLSX,book,'Invoice lines',data.invoices.flatMap(i=>(i.lines||[]).map(l=>({'Invoice number':i.number,'Description':l.description,'Quantity':l.qty,'Unit price':l.rate,'VAT / tax %':i.taxRate,'Line subtotal':num(l.qty)*num(l.rate)}))),['Invoice number','Description','Quantity','Unit price','VAT / tax %','Line subtotal']);
  append(XLSX,book,'Estimates',data.estimates.map(i=>{const t=totals(i.lines,i.taxRate);return{'Estimate number':i.number,'Customer':names.get(i.customerId)||'','Issue date':i.issueDate,'Valid until':i.validUntil,'Status':i.status,'Currency':i.currency,'VAT / tax %':i.taxRate,'Subtotal':t.subtotal,'VAT / tax':t.vat,'Total':t.total,'Notes':i.notes}}),['Estimate number','Customer','Issue date','Valid until','Status','Currency','VAT / tax %','Subtotal','VAT / tax','Total','Notes']);
  append(XLSX,book,'Estimate lines',data.estimates.flatMap(i=>(i.lines||[]).map(l=>({'Estimate number':i.number,'Description':l.description,'Quantity':l.qty,'Unit price':l.rate,'VAT / tax %':i.taxRate,'Line subtotal':num(l.qty)*num(l.rate)}))),['Estimate number','Description','Quantity','Unit price','VAT / tax %','Line subtotal']);
  append(XLSX,book,'Recurring',(recurring.data||[]).map(p=>({'Name':p.name,'Customer':names.get(p.customer_id)||'','Status':p.active?'active':'paused','Frequency':p.frequency,'Every':p.interval_count,'Next invoice date':p.next_issue_date,'Currency':p.currency,'Discount %':p.discount_rate,'Total':recurringTotal(p),'Notes':p.notes||''})),['Name','Customer','Status','Frequency','Every','Next invoice date','Currency','Discount %','Total','Notes']);
  append(XLSX,book,'Recurring lines',(recurring.data||[]).flatMap(p=>(p.recurring_invoice_items||[]).map(l=>({'Profile':p.name,'Description':l.description,'Quantity':l.quantity,'Unit price':l.unit_price,'VAT / tax %':l.tax_rate}))),['Profile','Description','Quantity','Unit price','VAT / tax %']);
  append(XLSX,book,'Catalog',(products.data||[]).map(i=>({'Name':i.name,'Type':i.kind,'Description':i.description||'','SKU / code':i.sku||'','Unit':i.unit||'item','Unit price':num(i.unit_price),'VAT / tax %':num(i.tax_rate),'Currency':i.currency,'Status':i.active?'active':'archived'})),['Name','Type','Description','SKU / code','Unit','Unit price','VAT / tax %','Currency','Status']);
  append(XLSX,book,'Export info',[{'Item':'Product','Value':'SoloBizKit Pro'},{'Item':'Workspace','Value':workspace.name||''},{'Item':'Workspace role','Value':workspace.role||''},{'Item':'Exported at','Value':new Date().toISOString()},{'Item':'Account','Value':session.user.email||''},{'Item':'Format version','Value':'2'}],['Item','Value']);
  const filename=`solobizkit-export-${new Date().toISOString().slice(0,10)}.xlsx`;save(XLSX,book,filename);return{filename,sheets:book.SheetNames.length};
}
