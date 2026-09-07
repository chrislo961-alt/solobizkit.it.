import { readFile } from 'node:fs/promises';
import process from 'node:process';

const files = await Promise.all([
  'backend.js','team-access.js','workspace-ui.js','payment-actions.js','reminder-actions.js','customer-history.js','document-attachments.js','activity-feed.js','spreadsheet-transfer-workspace.js','email-actions-v2.js','pro-app.js','customer-portal-actions.js','customer-workspace-actions.js','document-print-v2.js','bootstrap.js'
].map(async (name) => [name, await readFile(new URL(`../pro/${name}`, import.meta.url), 'utf8')]));
const src = Object.fromEntries(files);
const estimates = await readFile(new URL('../pro/estimates/estimates.js', import.meta.url), 'utf8');
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
need('document-attachments.js','workspace.canWrite');
need('spreadsheet-transfer-workspace.js','workspace.canWrite');
need('email-actions-v2.js','getDataOwnerId');
need('email-actions-v2.js','lifecycleSynced','server invoice lifecycle acknowledgement');
need('payment-actions.js','allowDraft','send-flow Stripe link exception');
need('document-print-v2.js',"action: 'download'",'canonical server PDF download');
need('document-print-v2.js',"button.textContent = 'PDF'",'canonical PDF action label');
need('pro-app.js','workspaceContext?.canWrite','workspace write gate');
need('pro-app.js','workspaceContext?.isOwner','owner billing gate');
need('customer-portal-actions.js','getWorkspaceContext','portal role gate');
need('customer-workspace-actions.js','getWorkspaceContext','customer workspace role gate');
if(!estimates.includes('workspaceContext?.canWrite')) errors.push('estimates.js: missing workspace write gate');
if(!estimates.includes('workspaceContext?.isOwner')) errors.push('estimates.js: missing owner billing gate');
need('bootstrap.js',"20260907-8",'current cache version');
need('bootstrap.js','version: 19','boot version 19');

if(errors.length){
  console.error('\nPro team/workspace audit failed:');
  errors.forEach((error)=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('Pro team/workspace audit passed: active workspace ownership, roles, invitations, payments, reminders, attachments, activity, Excel paths, canonical invoice PDF and read-only UI are workspace-aware.');