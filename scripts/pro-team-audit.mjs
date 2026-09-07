import { readFile } from 'node:fs/promises';
import process from 'node:process';

const files = await Promise.all([
  'backend.js','team-access.js','workspace-ui.js','payment-actions.js','reminder-actions.js','customer-history.js','document-attachments.js','activity-feed.js','spreadsheet-transfer-workspace.js','email-actions-v2.js','pro-app.js','customer-portal-actions.js','customer-workspace-actions.js','document-print-v2.js','document-defaults.js','document-options-v2.js','document-ux-v2.js','crm-ux-v3.js','deep-links.js','lead-followups.js','today-center.js','crm-next-actions.js','crm-automation-rules.js','crm-followup-assistant.js','bootstrap.js'
].map(async (name) => [name, await readFile(new URL(`../pro/${name}`, import.meta.url), 'utf8')]));
const src = Object.fromEntries(files);
const estimates = await readFile(new URL('../pro/estimates/estimates.js', import.meta.url), 'utf8');
const estimateDeepLinks = await readFile(new URL('../pro/estimates/new-deeplink.js', import.meta.url), 'utf8');
const leads = await readFile(new URL('../pro/leads/leads.js', import.meta.url), 'utf8');
const pipeline = await readFile(new URL('../pro/pipeline/pipeline.js', import.meta.url), 'utf8');
const pipelineHtml = await readFile(new URL('../pro/pipeline/index.html', import.meta.url), 'utf8');
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
need('customer-history.js','data-customer-actions');
need('customer-history.js','currencySummary');
need('customer-history.js','invoice=${encodeURIComponent(invoice.id)}');
need('crm-ux-v3.js','data-customer-actions');
need('crm-ux-v3.js','data.workspace?.canWrite');
need('crm-ux-v3.js','documentHref');
need('document-attachments.js','workspace.canWrite');
need('document-options-v2.js','getWorkspaceContext');
need('document-options-v2.js','if (!workspace?.canWrite) return');
need('document-ux-v2.js','requireWrite');
need('document-ux-v2.js','data.workspace?.canWrite');
need('spreadsheet-transfer-workspace.js','workspace.canWrite');
need('email-actions-v2.js','getDataOwnerId');
need('email-actions-v2.js','lifecycleSynced');
forbid('email-actions-v2.js',"supabase.from('estimates').update",'client-side estimate lifecycle update');
need('payment-actions.js','allowDraft');
need('document-print-v2.js',"action: 'download'");
need('document-print-v2.js',"send-estimate-email");
forbid('document-defaults.js','popup.document.write','legacy document print renderer');
forbid('pro-app.js','function printInvoice','legacy invoice print renderer');
forbid('pro-app.js','popup.document.write','legacy local invoice PDF renderer');
need('pro-app.js','data-customer-id');
need('pro-app.js','data-invoice-id');
need('pro-app.js','workspaceContext?.canWrite');
need('pro-app.js','workspaceContext?.isOwner');
need('customer-portal-actions.js','getWorkspaceContext');
need('customer-workspace-actions.js','getWorkspaceContext');
need('deep-links.js','requestedCustomer');
need('deep-links.js','wantsNew');
need('lead-followups.js','tr.crm-selected[data-customer-id]');

need('backend.js',"supabase.rpc('save_invoice_with_items'");
need('backend.js',"supabase.rpc('save_estimate_with_items'");
need('backend.js',"supabase.rpc('convert_estimate_to_invoice'");
need('backend.js','shouldUseAutomaticNumber');
forbid('backend.js',"supabase.from('invoice_items').delete()",'client-side invoice line rewrite');
forbid('backend.js',"supabase.from('estimate_items').delete()",'client-side estimate line rewrite');

if(!estimates.includes('workspaceContext?.canWrite')) errors.push('estimates.js: missing workspace write gate');
if(!estimates.includes('workspaceContext?.isOwner')) errors.push('estimates.js: missing owner billing gate');
if(!estimates.includes('data-estimate-id')) errors.push('estimates.js: missing native estimate ids');
if(!estimateDeepLinks.includes('presetCustomer')) errors.push('new-deeplink.js: missing estimate customer preset');
if(!estimateDeepLinks.includes('requestedEstimate')) errors.push('new-deeplink.js: missing exact estimate deep link');
if(!leads.includes('matchedCustomer')) errors.push('leads.js: missing submission-to-CRM matching');
if(!leads.includes('Create estimate')) errors.push('leads.js: missing lead-to-estimate action');

for(const token of ["supabase.from('crm_deals')","supabase.from('crm_tasks')","context?.canWrite",'dragstart','drop','lead_score','sync_crm_automation','engagement_count','get_crm_pipeline_report','lost_reason','save_crm_followup_task','pipeline-stage-select']) if(!pipeline.includes(token)) errors.push(`pipeline.js: missing ${token}`);
if(!pipelineHtml.includes('/pro/pipeline/pipeline.js?v=20260907-17')) errors.push('pipeline/index.html: missing current pipeline entrypoint');
if(!pipelineHtml.includes('/pro/crm-automation-rules.js?v=20260907-17')) errors.push('pipeline/index.html: missing current automation rules UI');
if(!pipelineHtml.includes('/pro/crm-followup-assistant.js?v=20260907-17')) errors.push('pipeline/index.html: missing CRM follow-up assistant');
need('today-center.js',"supabase.from('crm_tasks')");
need('today-center.js',"sync_crm_automation");
need('crm-next-actions.js',"supabase.rpc('get_crm_next_actions'");
need('crm-next-actions.js','invoice_viewed');
need('crm-next-actions.js','data-draft-followup');
need('crm-next-actions.js','sbk_language');
need('crm-automation-rules.js','crm_automation_settings');
need('crm-automation-rules.js','context?.canAdmin');
need('crm-automation-rules.js','auto_invoice_view_followup');
need('crm-followup-assistant.js',"kind:'followup'");
need('crm-followup-assistant.js','data-draft-followup');
need('crm-followup-assistant.js','Review and edit before sending');
need('bootstrap.js',"20260907-17",'current cache version');
need('bootstrap.js','version: 28','boot version 28');
need('bootstrap.js','today-center.js');
need('bootstrap.js','crm-next-actions.js');
need('bootstrap.js','crm-followup-assistant.js');

if(errors.length){
  console.error('\nPro team/workspace audit failed:');
  errors.forEach((error)=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('Pro team/workspace audit passed: workspace roles, canonical documents, CRM intelligence, invoice engagement, outcome reporting, automation rules and approval-based follow-ups are enforced.');
