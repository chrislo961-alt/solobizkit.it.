const params = new URLSearchParams(location.search);
const wantsNew = params.get('new') === '1';
const presetCustomer = params.get('customer') || '';
let opened = false;

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
new MutationObserver(() => {
  openWhenReady();
  if (opened) selectPresetCustomer();
}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','open']});
openWhenReady();