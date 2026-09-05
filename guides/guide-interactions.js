(function(){
  'use strict';

  const article=document.querySelector('.g-card');
  if(!article)return;

  const path=location.pathname;
  const slug=(path.split('/').filter(Boolean).pop()||'guide').replace(/[^a-z0-9-]/gi,'-').toLowerCase();
  const storageKey='sbk-guide-progress:'+path;
  const checkboxes=[...article.querySelectorAll('.g-check input[type="checkbox"]')];
  const templates=[...article.querySelectorAll('.g-template')];
  let storageAvailable=true;

  function track(name,params){
    if(typeof window.sbkTrack==='function')window.sbkTrack(name,Object.assign({guide_path:path},params||{}));
  }

  function readProgress(){
    try{return JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch(_){storageAvailable=false;return{}}
  }
  function writeProgress(state){
    if(!storageAvailable)return;
    try{localStorage.setItem(storageKey,JSON.stringify(state))}catch(_){storageAvailable=false}
  }

  function fallbackCopy(text){
    const area=document.createElement('textarea');
    area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';
    document.body.appendChild(area);area.select();
    try{document.execCommand('copy')}catch(_){}
    area.remove();
  }
  async function copyText(text){
    if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return}
    fallbackCopy(text);
  }

  const live=document.createElement('span');
  live.className='g-sr-only';live.setAttribute('aria-live','polite');
  document.body.appendChild(live);
  function announce(message){live.textContent='';requestAnimationFrame(()=>{live.textContent=message})}

  const tools=document.createElement('div');
  tools.className='g-guide-tools';
  tools.innerHTML='<div class="g-guide-tools-label"><strong>Use this guide</strong><span>Work through it, save progress or keep a copy.</span></div><div class="g-guide-tools-actions"></div>';
  const actions=tools.querySelector('.g-guide-tools-actions');

  function button(label,handler,extraClass){
    const el=document.createElement('button');el.type='button';el.className='g-guide-btn'+(extraClass?' '+extraClass:'');el.textContent=label;el.addEventListener('click',handler);actions.appendChild(el);return el;
  }

  button('Print / Save PDF',()=>{track('guide_print');window.print()});
  button('Copy page link',async(e)=>{
    try{await copyText(location.href);e.currentTarget.textContent='Link copied';announce('Page link copied');setTimeout(()=>e.currentTarget.textContent='Copy page link',1400);track('guide_link_copy')}catch(_){announce('Could not copy the page link')}
  });

  if(checkboxes.length){
    button('Download checklist',()=>{
      const title=(document.querySelector('h1')?.textContent||'SoloBizKit guide').trim();
      const lines=checkboxes.map((box)=>{
        const label=article.querySelector('label[for="'+CSS.escape(box.id)+'"]');
        return (box.checked?'[x] ':'[ ] ')+(label?.textContent.trim()||box.id);
      });
      const text=title+'\n'+location.href+'\n\n'+lines.join('\n')+'\n';
      const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='solobizkit-'+slug+'-checklist.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);track('guide_checklist_download');
    });
  }

  article.prepend(tools);

  if(checkboxes.length){
    const saved=readProgress();
    checkboxes.forEach((box,index)=>{
      const key=box.id||String(index);box.checked=Boolean(saved[key]);box.closest('.g-check')?.classList.toggle('is-complete',box.checked);
    });

    const progress=document.createElement('div');progress.className='g-progress';
    progress.innerHTML='<div class="g-progress-head"><div><strong>Your progress</strong><span class="g-progress-count"></span></div><button type="button" class="g-progress-reset">Reset</button></div><div class="g-progress-track" aria-hidden="true"><span></span></div><div class="g-progress-note"></div>';
    tools.insertAdjacentElement('afterend',progress);
    const count=progress.querySelector('.g-progress-count');const fill=progress.querySelector('.g-progress-track span');const note=progress.querySelector('.g-progress-note');
    note.textContent=storageAvailable?'Saved only in this browser on this device.':'Progress works for this visit but browser storage is unavailable.';

    let completionTracked=false;
    function updateProgress(save=true){
      const state={};let done=0;
      checkboxes.forEach((box,index)=>{const key=box.id||String(index);state[key]=box.checked;if(box.checked)done++;box.closest('.g-check')?.classList.toggle('is-complete',box.checked)});
      const pct=Math.round(done/checkboxes.length*100);count.textContent=done+' of '+checkboxes.length+' complete';fill.style.width=pct+'%';progress.setAttribute('aria-label','Guide progress: '+pct+' percent');
      if(save)writeProgress(state);
      if(done===checkboxes.length&&!completionTracked){completionTracked=true;track('guide_checklist_complete',{checklist_items:checkboxes.length});announce('Checklist complete')}
      if(done<checkboxes.length)completionTracked=false;
    }
    checkboxes.forEach((box)=>box.addEventListener('change',()=>updateProgress(true)));
    progress.querySelector('.g-progress-reset').addEventListener('click',()=>{
      if(!window.confirm('Reset all saved checklist progress for this guide?'))return;
      checkboxes.forEach(box=>{box.checked=false});writeProgress({});updateProgress(false);track('guide_progress_reset');announce('Checklist progress reset');
    });
    updateProgress(false);
  }

  templates.forEach((template,index)=>{
    const text=template.textContent.trim();if(!text)return;
    const row=document.createElement('div');row.className='g-copy-row';
    const looksLikePrompt=/\b(ai|act as|build me|create|review|rewrite|i am building|help me)\b/i.test(text);
    row.innerHTML='<span>'+(looksLikePrompt?'AI prompt':'Copy-ready template')+'</span><button type="button" class="g-copy-btn">'+(looksLikePrompt?'Copy prompt':'Copy template')+'</button>';
    template.insertAdjacentElement('beforebegin',row);
    const btn=row.querySelector('button');
    btn.addEventListener('click',async()=>{
      try{await copyText(text);const original=btn.textContent;btn.textContent='Copied';btn.classList.add('is-copied');announce('Copied to clipboard');setTimeout(()=>{btn.textContent=original;btn.classList.remove('is-copied')},1400);track('guide_template_copy',{template_index:index+1,template_type:looksLikePrompt?'ai_prompt':'template'})}catch(_){announce('Could not copy this template')}
    });
  });
})();
