import { getSession, getWorkspaceContext, setActiveWorkspace, supabase } from './backend.js';

let context=null,session=null,processingInvite=false;
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

async function acceptInvitation(){
  const token=new URLSearchParams(location.search).get('invite');
  if(!token||processingInvite||!session)return;
  processingInvite=true;
  try{
    const {data,error}=await supabase.functions.invoke('workspace-invite-accept',{body:{token}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    const url=new URL(location.href);url.searchParams.delete('invite');url.searchParams.set('team','joined');history.replaceState({},'',url);
    window.sbkToast?.('Workspace joined successfully.','success');
    setTimeout(()=>location.reload(),500);
  }catch(error){console.error(error);window.sbkToast?.(error?.message||'Could not accept workspace invitation.','error');}
  finally{processingInvite=false;}
}

function applyRoleGuards(){
  if(!context)return;
  document.documentElement.dataset.workspaceRole=context.role||'';
  document.documentElement.dataset.workspaceOwner=context.isOwner?'true':'false';
  if(context.canWrite)return;
  const selectors=['#newCustomerTop','#newInvoiceTop','#newEstimate','#newRecurring','#newProduct','#newForm','#importCsv','#xlsxCatalogImport','#xlsxCustomerImport','[data-edit-customer]','[data-invoice-customer]','[data-edit-invoice]','[data-paid-invoice]','[data-edit]','[data-convert]','[data-edit-item]','[data-toggle-item]','[data-edit-form]','[data-toggle-form]'];
  document.querySelectorAll(selectors.join(',')).forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true');});
}

function applySpreadsheetGuard(){
  if(context?.isOwner)return;
  document.querySelectorAll('#importCsv,#exportCsv,#xlsxCatalogImport,#xlsxCatalogExport,#xlsxCustomerImport,#xlsxCustomerExport,[data-import-contacts],[data-import-catalog],[data-export-all],[data-template-contacts],[data-template-catalog]').forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true');});
}

function renderWorkspaceSwitcher(){
  if(!context||!session)return;
  const host=document.querySelector('#authActions');
  if(!host||host.querySelector('[data-workspace-switcher]'))return;
  const chip=host.querySelector('.account-chip');
  if(chip){const strong=chip.querySelector('strong'),small=chip.querySelector('small');if(strong)strong.textContent=context.name||session.user.email||'Workspace';if(small)small.textContent=String(context.role||'member').toUpperCase();}
  if((context.workspaces||[]).length<2)return;
  const select=document.createElement('select');select.className='select workspace-switcher';select.dataset.workspaceSwitcher='1';select.setAttribute('aria-label','Workspace');
  select.innerHTML=context.workspaces.map(w=>`<option value="${esc(w.workspaceId)}" ${w.active?'selected':''}>${esc(w.name)} · ${esc(w.role)}</option>`).join('');
  select.onchange=async()=>{select.disabled=true;try{await setActiveWorkspace(select.value);location.reload();}catch(error){console.error(error);window.sbkToast?.(error?.message||'Could not switch workspace.','error');select.disabled=false;}};
  host.insertBefore(select,host.firstChild);
}

async function boot(){
  try{
    session=await getSession();if(!session)return;
    context=await getWorkspaceContext(true);if(!context)return;
    await acceptInvitation();
    const style=document.createElement('style');style.textContent='.workspace-switcher{max-width:190px;min-width:130px;padding:7px 30px 7px 9px;font-size:11px}.team-role-badge{text-transform:uppercase}';document.head.appendChild(style);
    const enhance=()=>{renderWorkspaceSwitcher();applyRoleGuards();applySpreadsheetGuard();};
    let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}).observe(document.body,{childList:true,subtree:true});enhance();
    if(location.pathname.startsWith('/pro/settings')) import('./team-access.js?v=20260907-4').catch(console.error);
  }catch(error){console.error('[SoloBizKit Team]',error);}
}
boot();
