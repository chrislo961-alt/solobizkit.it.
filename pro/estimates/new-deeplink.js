const wantsNew = new URLSearchParams(location.search).get('new') === '1';
let opened = false;
function openWhenReady(){
  if (!wantsNew || opened) return;
  const button = document.querySelector('#newEstimateInner') || document.querySelector('#newEstimate');
  if (!button || button.hidden || button.disabled) return;
  opened = true;
  button.click();
  history.replaceState({}, '', '/pro/estimates/');
}
new MutationObserver(openWhenReady).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled']});
openWhenReady();