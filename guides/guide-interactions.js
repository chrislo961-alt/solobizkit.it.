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

  const resources={
    'start-small-business':{
      title:'7-day small business startup workbook',
      description:'A practical first-week plan with decisions, tasks and an AI planning prompt.',
      filename:'solobizkit-small-business-startup-workbook.md',
      type:'text/markdown;charset=utf-8',
      content:[
        '# SoloBizKit — 7-Day Small Business Startup Workbook','',
        'Use this as an operational starting point. Verify local registration, tax, VAT, licensing and legal requirements separately.','',
        '## Business snapshot','Business name:','What I sell:','Ideal customer:','Main problem I solve:','Primary market/location:','Main way customers will contact me:','',
        '## Day 1 — Offer','[ ] Write one sentence explaining what I sell and who it is for','[ ] List 3 concrete deliverables or outcomes','[ ] Remove vague words that do not explain the offer','',
        '## Day 2 — Name and domain','[ ] Check business-name availability','[ ] Check relevant trademarks where appropriate','[ ] Shortlist 3 domain names','[ ] Register the best workable domain','',
        '## Day 3 — Website','[ ] Write home-page headline','[ ] Add services','[ ] Add real proof or experience','[ ] Add contact method','[ ] Publish a simple first version','',
        '## Day 4 — Pricing','[ ] Calculate minimum sustainable hourly/day rate','[ ] Create one starter package or project price','[ ] Decide deposit/payment terms','',
        '## Day 5 — Invoicing and payment','[ ] Choose invoice numbering format','[ ] Prepare business/payment details','[ ] Decide standard due date','[ ] Test invoice-to-payment workflow','',
        '## Day 6 — Customers and CRM','[ ] Create a lead/customer list','[ ] Add next-follow-up date','[ ] Add status: Lead / Contacted / Estimate / Client / Lost','',
        '## Day 7 — First outreach','[ ] Build a list of 20 realistic prospects','[ ] Contact the first 5','[ ] Record replies and next actions','[ ] Schedule next weekly review','',
        '## AI planning prompt','I am starting a [business type] for [ideal customer] in [market/location]. My offer is [offer]. Help me turn this into a realistic 7-day launch plan. Keep it simple, flag missing information, do not invent legal requirements, reviews, customers or credentials, and tell me what I should verify locally.'
      ].join('\n')
    },
    'build-business-website-cheap':{
      title:'AI website starter brief + launch checklist',
      description:'Fill in the brief, paste the prompt into an AI assistant and work through the launch checks.',
      filename:'solobizkit-ai-website-starter-pack.md',
      type:'text/markdown;charset=utf-8',
      content:[
        '# SoloBizKit — AI Website Starter Pack','',
        '## 1. Business brief','Business name:','Business type:','Location/market:','Ideal customer:','Main service/product:','Top 3 services:','Main customer problem:','Primary CTA:','Phone:','Email:','Proof I can honestly show:','Brand colors (optional):','',
        '## 2. AI build prompt','Build a complete responsive one-page business website using HTML and CSS. Use the business brief below. Keep it fast, accessible, mobile friendly and professional. Include hero, services, why choose us, process, FAQ and contact. Add title tag, meta description, one H1 and clear CTA buttons. Do not invent reviews, statistics, certifications, locations or claims. Mark anything I still need to replace with real information. Then explain exactly how a beginner can preview the files locally and publish them with a free static host.','',
        'PASTE YOUR COMPLETED BUSINESS BRIEF HERE','',
        '## 3. Launch checklist','[ ] Domain works','[ ] HTTPS works','[ ] Every navigation link works','[ ] Every button works on mobile','[ ] Contact email/phone is correct','[ ] Contact form tested','[ ] No placeholder text remains','[ ] No invented AI claims remain','[ ] Page title and H1 are descriptive','[ ] Images have useful alt text','[ ] Privacy information matches the actual site setup','[ ] Sitemap/Search Console configured if relevant','',
        '## 4. Final AI QA prompt','Review my website before launch. Check for broken links, unclear wording, fake-sounding AI copy, missing contact details, accessibility issues, mobile problems, SEO basics and trust problems. Do not suggest claims I cannot verify.'
      ].join('\n')
    },
    'get-first-freelance-clients':{
      title:'First-client prospect tracker',
      description:'A CSV you can open in Excel or Google Sheets to track outreach and follow-ups.',
      filename:'solobizkit-first-client-prospect-tracker.csv',
      type:'text/csv;charset=utf-8',
      content:[
        'Prospect,Company,Website,Why they fit,Contact person,Email or channel,Status,First contact date,Next follow-up,Last message,Potential project,Estimated value,Notes',
        'Example prospect,Example company,https://example.com,Clear fit for my offer,Jane Doe,email,Researching,,,,Landing page,1000,Replace this example row with a real prospect'
      ].join('\n')
    },
    'price-freelance-services':{
      title:'Freelance pricing worksheet',
      description:'A CSV worksheet for income target, costs, billable capacity and project pricing assumptions.',
      filename:'solobizkit-freelance-pricing-worksheet.csv',
      type:'text/csv;charset=utf-8',
      content:[
        'Section,Item,Your value,Notes',
        'Annual plan,Desired personal income,,Before personal tax where appropriate',
        'Annual plan,Business overhead,,Software insurance accounting equipment marketing etc',
        'Annual plan,Profit/buffer target,,Amount you want above costs',
        'Capacity,Working weeks per year,,Exclude realistic time off',
        'Capacity,Hours worked per week,,Total work time',
        'Capacity,Billable percentage,,Example 60%',
        'Pricing,Required annual revenue,,Income + overhead + buffer',
        'Pricing,Estimated billable hours,,Weeks x hours x billable percentage',
        'Pricing,Minimum hourly baseline,,Required revenue / billable hours',
        'Project,Estimated delivery hours,,Include meetings admin revisions',
        'Project,Direct project costs,,Contractors materials fees',
        'Project,Risk/scope buffer,,Extra hours or amount',
        'Project,Quoted project price,,Final price offered',
        'Project,Actual hours after completion,,Use this to improve future estimates'
      ].join('\n')
    },
    'freelance-invoice-checklist':{
      title:'Invoice pre-send checklist',
      description:'A reusable checklist to run before every invoice leaves your business.',
      filename:'solobizkit-invoice-pre-send-checklist.md',
      type:'text/markdown;charset=utf-8',
      content:[
        '# SoloBizKit — Invoice Pre-Send Checklist','',
        'Invoice number:','Client:','Issue date:','Due date:','Total:','Currency:','',
        '## Identity and recipient','[ ] My business name/contact details are correct','[ ] Client legal/billing name is correct','[ ] Billing email/address is correct','[ ] Required PO/reference number is included','',
        '## Invoice details','[ ] Invoice number is unique and follows my sequence','[ ] Issue date is correct','[ ] Due date is explicit','[ ] Line items describe recognizable work','[ ] Quantity/rate is correct where relevant','[ ] Subtotal is correct','[ ] Tax/VAT treatment has been verified for this invoice','[ ] Total and currency are correct','',
        '## Getting paid','[ ] Payment terms match the agreement','[ ] Bank/payment instructions are correct','[ ] Payment link works if used','[ ] Deposit/previous payment is reflected correctly','',
        '## Final check','[ ] Recipient, amount, tax, dates and payment details checked one last time','[ ] Supporting files attached if needed','[ ] My own copy is saved','',
        'Note: invoice requirements vary by jurisdiction. Verify mandatory local fields separately.'
      ].join('\n')
    },
    'simple-crm-small-business':{
      title:'Simple CRM starter sheet',
      description:'A minimal customer and lead tracker you can open in Excel or Google Sheets immediately.',
      filename:'solobizkit-simple-crm-starter.csv',
      type:'text/csv;charset=utf-8',
      content:[
        'Customer or lead,Company,Email,Phone,Status,Source,Last contact,Next action,Next follow-up,Potential value,Estimate status,Invoice status,Notes',
        'Example lead,Example company,jane@example.com,,Lead,Referral,,Send intro email,,,Not sent,Not applicable,Delete this example and add real contacts'
      ].join('\n')
    },
    'small-business-monthly-checklist':{
      title:'Monthly business review worksheet',
      description:'A reusable monthly review for cash, invoices, pipeline, systems and next priorities.',
      filename:'solobizkit-monthly-business-review.md',
      type:'text/markdown;charset=utf-8',
      content:[
        '# SoloBizKit — Monthly Business Review','',
        'Month:','Review date:','',
        '## 1. Money','Cash available:','Expected cash in next 30 days:','Major payments due next 30 days:','Overdue invoice total:','Tax/VAT amount reserved:','[ ] All overdue invoices reviewed','[ ] Recurring invoices checked','[ ] Expenses/documents recorded','',
        '## 2. Sales pipeline','Open leads:','Open estimates:','Likely value of active opportunities:','[ ] Every active lead has a next action','[ ] Dead opportunities archived','[ ] Good customers considered for referral/feedback request','',
        '## 3. Profitability','Most profitable work this month:','Work that consumed too much time:','Price/scope change to test next month:','',
        '## 4. Systems','[ ] Website/contact form tested','[ ] Payment links tested','[ ] Important files/backups checked','[ ] Old access links/users reviewed','[ ] Unused subscriptions reviewed','',
        '## 5. Next month','Top priority 1:','Top priority 2:','Top priority 3:','One thing I will stop doing:'
      ].join('\n')
    },
    'cash-flow-basics':{
      title:'90-day cash-flow forecast',
      description:'A simple CSV for expected receipts, bills and running cash balance.',
      filename:'solobizkit-90-day-cash-flow-forecast.csv',
      type:'text/csv;charset=utf-8',
      content:[
        'Date,Type,Description,Expected cash in,Expected cash out,Status,Running balance,Notes',
        '2026-09-01,Opening balance,Starting cash,,,,10000,Replace with your actual opening balance',
        '2026-09-10,Customer receipt,Invoice 1001,2500,,Expected,,Use expected payment date not invoice date',
        '2026-09-15,Expense,Software subscriptions,,200,Committed,,',
        '2026-09-20,Tax/VAT,Tax reserve/payment,,1000,Planned,,',
        '2026-09-30,Review,Month-end review,,,Planned,,Add the next 60 days below'
      ].join('\n')
    },
    'late-paying-clients':{
      title:'Late-payment email template pack',
      description:'Three calm reminder templates from friendly nudge to firmer overdue follow-up.',
      filename:'solobizkit-late-payment-email-templates.md',
      type:'text/markdown;charset=utf-8',
      content:[
        '# SoloBizKit — Late-Payment Email Templates','',
        'Adapt these to your agreement and local rules. Do not add fees, penalties or legal threats unless you are entitled to use them.','',
        '## 1. Friendly reminder','Subject: Invoice [NUMBER] — payment reminder','',
        'Hi [NAME],','Just a quick reminder that invoice [NUMBER] for [AMOUNT] was due on [DATE]. I have attached/shared the invoice again for convenience.','Could you confirm that it is in your payment process, or let me know if you need anything from me?','Thanks,','[YOUR NAME]','',
        '## 2. Second follow-up','Subject: Follow-up — invoice [NUMBER] overdue','',
        'Hi [NAME],','I am following up on invoice [NUMBER] for [AMOUNT], originally due on [DATE]. I have not yet seen the payment come through.','Could you please confirm the expected payment date, and let me know if anything is blocking approval?','Thanks,','[YOUR NAME]','',
        '## 3. Firmer overdue notice','Subject: Invoice [NUMBER] remains overdue','',
        'Hi [NAME],','Invoice [NUMBER] for [AMOUNT] remains unpaid after the due date of [DATE]. Please confirm payment status and the date we should expect payment.','If there is a dispute or missing information, please tell me today so we can resolve it. Otherwise, I will follow the next step set out in our agreed payment terms.','Regards,','[YOUR NAME]'
      ].join('\n')
    },
    'write-professional-estimate':{
      title:'Estimate & scope template',
      description:'A practical quote structure with scope, exclusions, assumptions, timing and approval.',
      filename:'solobizkit-estimate-scope-template.md',
      type:'text/markdown;charset=utf-8',
      content:[
        '# [YOUR BUSINESS] — Estimate / Quote','',
        'Estimate number:','Issue date:','Valid until:','Customer:','Project:','Currency:','',
        '## Project summary','Briefly describe the outcome the customer is buying.','',
        '## Included scope','- Deliverable 1','- Deliverable 2','- Deliverable 3','- Included revisions:','',
        '## Price','| Item | Qty | Rate | Amount |','|---|---:|---:|---:|','| Service / deliverable | 1 | | |','',
        'Subtotal:','Tax/VAT:','Total:','',
        '## Assumptions','- Customer supplies:','- Access/information required by:','- Work begins when:','',
        '## Not included','-','-','',
        '## Timing','Expected start:','Expected delivery/window:','',
        '## Payment terms','Deposit:','Milestones:','Final balance due:','Payment method:','',
        '## Changes to scope','Work outside the included scope will be confirmed and priced before it is added.','',
        '## Acceptance','To approve this estimate, [describe your real approval method].','Approved by:','Date:','',
        'Note: the legal effect of an estimate or quote depends on jurisdiction and agreement terms.'
      ].join('\n')
    }
  };

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
  function downloadText(filename,type,text){
    const prefix=type.startsWith('text/csv')?'\ufeff':'';
    const blob=new Blob([prefix,text],{type});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
      downloadText('solobizkit-'+slug+'-checklist.txt','text/plain;charset=utf-8',title+'\n'+location.href+'\n\n'+lines.join('\n')+'\n');
      track('guide_checklist_download');
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

  const resource=resources[slug];
  if(resource){
    const card=document.createElement('div');card.className='g-resource';
    card.innerHTML='<div class="g-resource-copy"><span class="g-resource-kicker">Free starter resource</span><strong></strong><p></p></div><button type="button" class="g-resource-download">Download</button>';
    card.querySelector('strong').textContent=resource.title;card.querySelector('p').textContent=resource.description;
    card.querySelector('button').addEventListener('click',()=>{downloadText(resource.filename,resource.type,resource.content);track('guide_resource_download',{resource_slug:slug,resource_file:resource.filename});announce(resource.title+' downloaded')});
    const progress=article.querySelector('.g-progress');(progress||tools).insertAdjacentElement('afterend',card);
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
