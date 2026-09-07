import { readFile } from 'node:fs/promises';
import process from 'node:process';

const files = await Promise.all([
  'backend.js','team-access.js','workspace-ui.js','payment-actions.js','reminder-actions.js','customer-history.js','document-attachments.js','activity-feed.js','spreadsheet-transfer-workspace.js','email-actions-v2.js','bootstrap.js','pro-app.js','customer-portal-actions.js','customer-workspace-actions.js'
].map(async (name) => [name, await readFile(new URL(`../pro/${name}`, import.meta.url), 'utf8')]));
const estimates = await readFile(new URL('../pro/estimates/estimates.js', import.meta.url), 'utf8');
const src = Object.fromEntries(files);
const errors=[];
const need=(file,text,label=text)=>{ if(!src[file]?.includes(text)) errors.push(`${file}: missing ${label}`); };
const forbid=(file,text,label=text)=>{ if(src[file]?.includes(text)) errors.push(`${file}: still contains ${label}`); };

for (const token of ['getWorkspaceContext','getDataOwnerId','setActiveWorkspace','get_current_workspace']) need('backend.js',token);
for (const role of ['owner','admin','member','accountant']) need('team-access.js',role,`role ${role}`);
need('team-access.js','workspace-invite');
need('workspace-ui.js','workspace-invite-accept');
need('workspace-ui.js','team_invite');
for (const file of ['payment-actions.js','reminder-actions.js','customer-history.js','document-attachments.js','activity-feed.js','spreadsheet-transfer-workspace.js']) {
  need(file,'getDataOwnerId');
  forbid(file,".eq('user_id', session.user.id)",'direct session.user.id data filter');
}
need('backend.js','requireWriteAccess','central write-role guard');
for (const token of ['saveCustomer','saveInvoice','saveEstimate','markInvoicePaid']) {
  if (!src['backend.js'].includes(`export async function ${token}`)) errors.push(`backend.js: missing ${token}`);
}
need('pro-app.js','function canWrite()','main workspace role gate');
need('pro-app.js',"Read only",'read-only customer/invoice UI');
if(!estimates.includes('function canWrite()')) errors.push('estimates.js: missing workspace role gate');
if(!estimates.includes('Read only')) errors.push('estimates.js: missing read-only estimate UI');
need('customer-portal-actions.js','getWorkspaceContext','portal role gate');
need('customer-workspace-actions.js','getWorkspaceContext','customer workspace role gate');
need('document-attachments.js','workspace.canWrite');
need('spreadsheet-transfer-workspace.js','workspace.canWrite');
need('email-actions-v2.js','getDataOwnerId');
need('bootstrap.js',"20260907-6",'current cache version');
need('bootstrap.js','version: 17','boot version 17');

if(errors.length){
  console.error('\nPro team/workspace audit failed:');
  errors.forEach((error)=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('Pro team/workspace audit passed: active workspace ownership, role-aware UI, invitations, payments, reminders, attachments, activity and Excel paths are workspace-aware.');
