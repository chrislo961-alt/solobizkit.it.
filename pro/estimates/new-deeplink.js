const params = new URLSearchParams(location.search);
const wantsNew = params.get('new') === '1';
const presetCustomer = params.get('customer') || '';
const requestedEstimate = params.get('estimate') || '';
const wantsEdit = params.get('edit') === '1';
let opened = false;
let highlighted = false;

const style = document.createElement('style');
style.textContent = '.sbk-deeplink-target{outline:2px solid rgba(36,87,245,.45);outline-offset:-2px;background:#f7faff!important;transition:outline .2s ease,background .2s ease}';
document.head.appendChild(style);

function selectPresetCustomer() {
  if (!presetCustomer) return;
  const select = document.querySelector('#modal[open] [name="customerId"]');
  if (!select || !select.querySelector(`option[value="${CSS.escape(presetCustomer)}"]`)) return;
  select.value = presetCustomer;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function openWhenReady(){
  if (!wantsNew || opened) return;
  const button = document.querySelector('#newEstimateInner') || document.querySelector('#newEstimate');
  if (!button || button.hidden || button.disabled) return;
  opened = true;
  button.click();
  requestAnimationFrame(selectPresetCustomer);
  history.replaceState({}, '', '/pro/estimates/');
}

function highlightEstimate(){
  if (!requestedEstimate || highlighted) return;
  const row = document.querySelector(`tr[data-estimate-id="${CSS.escape(requestedEstimate)}"]`);
  if (!row) return;
  highlighted = true;
  row.classList.add('sbk-deeplink-target');
  row.scrollIntoView({ block:'center', behavior:'smooth' });
  if (wantsEdit) {
    const edit = row.querySelector(`[data-edit="${CSS.escape(requestedEstimate)}"]`);
    if (edit && !edit.disabled) setTimeout(() => edit.click(), 120);
  }
  setTimeout(() => row.classList.remove('sbk-deeplink-target'), 5000);
}

function sync(){
  openWhenReady();
  if (opened) selectPresetCustomer();
  highlightEstimate();
}
new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','open','data-estimate-id']});
sync();