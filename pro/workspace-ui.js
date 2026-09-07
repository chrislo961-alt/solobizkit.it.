import { getSession, getWorkspaceContext, setActiveWorkspace, supabase } from './backend.js';

const lang=(()=>{try{return localStorage.getItem('sbk_language')||'en'}catch{return'en'}})();
const L={
 en:{workspace:'Workspace',accepting:'Accepting invitation…',accepted:'Invitation accepted. Opening workspace…',failed:'Could not accept invitation.',switching:'Switching workspace…'},
 no:{workspace:'Arbeidsområde',accepting:'Godtar invitasjonen…',accepted:'Invitasjonen er godtatt. Åpner arbeidsområdet…',failed:'Kunne ikke godta invitasjonen.',switching:'Bytter arbeidsområde…'},
 sv:{workspace:'Arbetsyta',accepting:'Accepterar inbjudan…',accepted:'Inbjudan accepterad. Öppnar arbetsytan…',failed:'Kunde inte acceptera inbjudan.',switching:'Byter arbetsyta…'},
 de:{workspace:'Arbeitsbereich',accepting:'Einladung wird angenommen…',accepted:'Einladung angenommen. Arbeitsbereich wird geöffnet…',failed:'Einladung konnte nicht angenommen werden.',switching:'Arbeitsbereich wird gewechselt…'},
 es:{workspace:'Espacio de trabajo',accepting:'Aceptando invitación…',accepted:'Invitación aceptada. Abriendo el espacio…',failed:'No se pudo aceptar la invitación.',switching:'Cambiando de espacio…'},
 fr:{workspace:'Espace de travail',accepting:"Acceptation de l’invitation…",accepted:'Invitation acceptée. Ouverture de l’espace…',failed:"Impossible d’accepter l’invitation.",switching:'Changement d’espace…'}
};
const t=L[lang]||L.en;
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

function toast(message,tone='success'){if(window.sbkToast)return window.sbkToast(message,tone);const el=document.createElement('div');el.className='workspace-toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),3200)}

async function acceptInvite(){
  const params=new URLSearchParams(location.search);const token=params.get('team_invite');if(!token)return;
  const session=await getSession();
  if(!session){sessionStorage.setItem('sbk_pending_team_invite',token);return;}
  params.delete('team_invite');
  history.replaceState({},'',`${location.pathname}${params.toString()?`?${params}`:''}${location.hash}`);
  toast(t.accepting);
  try{
    const {data,error}=await supabase.functions.invoke('workspace-invite-accept',{body:{token}});
    if(error)throw error;if(data?.error)throw new Error(data.error);
    await setActiveWorkspace(data.workspaceId);
    toast(t.accepted);
    setTimeout(()=>location.assign('/pro/'),500);
  }catch(error){console.error(error);toast(error?.message||t.failed,'error');}
}

async function acceptStoredInvite(){
  const session=await getSession();if(!session)return;const token=sessionStorage.getItem('sbk_pending_team_invite');if(!token)return;
  sessionStorage.removeItem('sbk_pending_team_invite');
  const url=new URL(location.href);url.searchParams.set('team_invite',token);location.replace(url.toString());
}

async function renderSwitcher(){
  const session=await getSession();if(!session)return;const context=await getWorkspaceContext();if(!context||context.workspaces.length<2)return;
  const actions=document.querySelector('.top-actions');if(!actions||actions.querySelector('[data-workspace-switcher]'))return;
  const wrap=document.createElement('label');wrap.className='workspace-switcher';wrap.dataset.workspaceSwitcher='1';wrap.innerHTML=`<span>${esc(t.workspace)}</span><select class="select" aria-label="${esc(t.workspace)}">${context.workspaces.map(w=>`<option value="${esc(w.workspaceId)}" ${w.active?'selected':''}>${esc(w.name)} · ${esc(w.role)}</option>`).join('')}</select>`;
  const auth=document.querySelector('#authActions');actions.insertBefore(wrap,auth||actions.firstChild);
  wrap.querySelector('select').addEventListener('change',async e=>{const select=e.currentTarget;select.disabled=true;toast(t.switching);try{await setActiveWorkspace(select.value);location.reload();}catch(error){console.error(error);toast(error?.message||t.failed,'error');select.disabled=false;}});
}

const style=document.createElement('style');style.textContent='.workspace-switcher{display:grid;gap:2px;min-width:150px}.workspace-switcher>span{font-size:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:850;color:var(--muted)}.workspace-switcher .select{padding:7px 28px 7px 9px;font-size:10px;max-width:210px}.workspace-toast{position:fixed;right:20px;bottom:20px;z-index:10000;background:#0c1b38;color:#fff;border-radius:13px;padding:12px 14px;box-shadow:0 20px 50px rgba(7,20,47,.28);font-size:12px;font-weight:750}@media(max-width:800px){.workspace-switcher{min-width:0}.workspace-switcher .select{max-width:145px}}';document.head.appendChild(style);

await acceptStoredInvite();
await acceptInvite();
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;renderSwitcher().catch(console.error)})}).observe(document.body,{childList:true,subtree:true});
renderSwitcher().catch(console.error);
