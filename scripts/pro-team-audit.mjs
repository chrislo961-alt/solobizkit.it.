import { readFile } from 'node:fs/promises';
import process from 'node:process';

const files = await Promise.all([
  'backend.js','team-access.js','workspace-ui.js','payment-actions.js','reminder-actions.js','customer-history.js','document-attachments.js','activity-feed.js','spreadsheet-transfer-workspace.js','email-actions-v2.js','pro-app.js','customer-portal-actions.js','customer-workspace-actions.js','document-print-v2.js','document-options-v2.js','document-ux-v2.js','crm-ux-v3.js','deep-links.js','bootstrap.js'
].map(async (name) => [name, await readFile(new URL(`../pro/${name}`, import.meta.url), 'utf8')]));
const src = Object.fromEntries(files);
const estimates = await readFile(new URL('../pro/estimates/estimates.js', import.meta.url), 'utf8');
const estimateDeepLinks = await readFile(new URL('../pro/estimates/new-deeplink.js', import.meta.url), 'utf8');
const leads = await readFile(new URL('../pro/leads/leads.js', import.meta.url), 'utf8');
const errors=[];
const need=(file,text,label=text)=>{ if(!src[file]?.includes(text)) errors.push(`${file}: missing ${label}`); };
const forbid=(file,text,label=text)=>{ if(src[file]?.includes(text)) errors.push(`${file}: still contains ${label}`); };

for (const token of ['getWorkspaceContext','getDataOwnerId','setActiveWorkspace','get_current_workspace','requireWriteAccess']) need('backend.js',token);
for (const role of ['owner','admin','member','accountant']) need('team-access.js',role,`role ${role}`);
need('team-access.js','workspace-invite');
need('workspace-ui.js','workspace-invite-accept');
need('workspace-ui.js','team_invite');
for (const file of ['payment-actions.js','reminder-actions.js','customer-history.js','document-attachments.js','activity-feed.js','spreadsheet-transfer-workspace.js']) {
  need(file,'getDataOwnerId');
  forbid(file,".eq('user_id', session.user.id)",'direct session.user.id data filter');
}
need('customer-history.js','data-customer-actions','neutral customer history anchor');
need('customer-history.js','currencySummary','currency-safe customer history totals');
need('customer-history.js','Open exact document','exact customer history document links');
need('customer-history.js','invoice=${encodeURIComponent(invoice.id)}','invoice deep link from history');
need('crm-ux-v3.js','data-customer-actions','neutral CRM customer action anchor');
need('crm-ux-v3.js','data.workspace?.canWrite','CRM write-role gate');
need('crm-ux-v3.js','Read only workspace access','CRM read-only state');
need('document-attachments.js','workspace.canWrite');
need('document-attachments.js',"selector: '.estimate-actions'",'read-only estimate attachment anchor');
need('document-attachments.js',"selector: '[data-print-invoice]'",'read-only invoice attachment anchor');
need('document-attachments.js','data-print-estimate','estimate id fallback for read-only attachments');
need('document-options-v2.js','getWorkspaceContext','document option role context');
need('document-options-v2.js','if (!workspace?.canWrite) return','read-only language persist guard');
need('document-ux-v2.js','requireWrite','duplicate/reuse write guard');
need('document-ux-v2.js','data.workspace?.canWrite','document UX role-aware controls');
need('spreadsheet-transfer-workspace.js','workspace.canWrite');
need('email-actions-v2.js','getDataOwnerId');
need('email-actions-v2.js','lifecycleSynced','server invoice lifecycle acknowledgement');
need('payment-actions.js','allowDraft','send-flow Stripe link exception');
need('document-print-v2.js',"action: 'download'",'canonical server PDF download');
need('document-print-v2.js',"send-estimate-email",'canonical estimate PDF endpoint');
need('document-print-v2.js',"dataset.printEstimate",'estimate PDF action');
need('document-print-v2.js',"button.textContent = 'PDF'",'canonical PDF action label');
need('pro-app.js','workspaceContext?.canWrite','workspace write gate');
need('pro-app.js','workspaceContext?.isOwner','owner billing gate');
need('customer-portal-actions.js','getWorkspaceContext','portal role gate');
need('customer-workspace-actions.js','getWorkspaceContext','customer workspace role gate');
need('deep-links.js','requestedCustomer','customer CRM deep link');
need('deep-links.js','wantsNew','new invoice deep link');
need('deep-links.js','sbk-deeplink-target','viewer-safe deep link highlight');

need('backend.js',"supabase.rpc('save_invoice_with_items'",'atomic invoice save RPC');
need('backend.js',"supabase.rpc('save_estimate_with_items'",'atomic estimate save RPC');
need('backend.js',"supabase.rpc('convert_estimate_to_invoice'",'server-side estimate conversion RPC');
need('backend.js','shouldUseAutomaticNumber','automatic/manual numbering guard');
forbid('backend.js',"supabase.from('invoice_items').delete()",'client-side invoice line rewrite');
forbid('backend.js',"supabase.from('estimate_items').delete()",'client-side estimate line rewrite');

if(!estimates.includes('workspaceContext?.canWrite')) errors.push('estimates.js: missing workspace write gate');
if(!estimates.includes('workspaceContext?.isOwner')) errors.push('estimates.js: missing owner billing gate');
if(!estimateDeepLinks.includes('presetCustomer')) errors.push('new-deeplink.js: missing estimate customer preset');
if(!estimateDeepLinks.includes('requestedEstimate')) errors.push('new-deeplink.js: missing exact estimate deep link');
if(!leads.includes('matchedCustomer')) errors.push('leads.js: missing submission-to-CRM matching');
if(!leads.includes('Create estimate')) errors.push('leads.js: missing lead-to-estimate action');
if(!leads.includes('customer=${encodeURIComponent(customer.id)}')) errors.push('leads.js: missing exact CRM customer handoff');
need('bootstrap.js',"20260907-12",'current cache version');
need('bootstrap.js','version: 23','boot version 23');

if(errors.length){
  console.error('\nPro team/workspace audit failed:');
  errors.forEach((error)=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('Pro team/workspace audit passed: workspace roles, canonical documents, atomic invoice/estimate saves and lead → customer → estimate/invoice deep links are workspace-aware.');
