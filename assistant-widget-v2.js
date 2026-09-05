(function(){
  'use strict';
  if(location.pathname.startsWith('/pro/')||location.pathname.startsWith('/lead/'))return;
  if(document.getElementById('sbk-assistant-root'))return;

  const journeys={
    start:{label:'Start a business',intro:'Practical startup steps, website, pricing and first-week actions.',links:[
      ['/guides/start-small-business/','Start a small business','A step-by-step startup workbook with AI prompts and a first-week plan.'],
      ['/guides/build-business-website-cheap/','Build your business website','Use AI and simple tools to get a real site online without a coding background.'],
      ['/business-name-generator/','Generate a business name','Brainstorm name ideas with a free tool.']
    ]},
    invoice:{label:'Create & manage invoices',intro:'Create one free or see when software starts saving real admin time.',links:[
      ['/invoice-generator/','Create a free invoice','Build and print a professional invoice without creating an account.'],
      ['/guides/freelance-invoice-checklist/','Choose the right invoicing setup','See what matters before paying for invoice software.'],
      ['/pro-pricing/','SoloBizKit Pro invoicing','Customer records, estimates, reminders, recurring invoices and payment tracking in one workspace.','pro']
    ]},
    clients:{label:'Find & manage clients',intro:'Get clients, organize follow-ups and keep customer work together.',links:[
      ['/guides/get-first-freelance-clients/','Get your first clients','Prospecting, outreach and follow-up with copy-ready templates.'],
      ['/guides/simple-crm-small-business/','Choose a CRM that earns its keep','Learn when a spreadsheet is enough and what software should actually save you from.'],
      ['/pro-pricing/','SoloBizKit Pro CRM','Keep leads, customer history, estimates, invoices and follow-ups together.','pro']
    ]},
    pricing:{label:'Price my work',intro:'Work out a sustainable rate, project price and profit margin.',links:[
      ['/guides/price-freelance-services/','Price freelance services','Work through a practical pricing model and scope controls.'],
      ['/hourly-rate-calculator/','Hourly Rate Calculator','Estimate a sustainable hourly rate from income, costs and capacity.'],
      ['/profit-margin-calculator/','Profit Margin Calculator','Check the margin left after costs.']
    ]},
    money:{label:'Profit, cash flow & numbers',intro:'Pick the business number you need to understand or improve.',links:[
      ['/profit-margin-calculator/','Profit Margin Calculator','Calculate profit and margin from revenue and costs.'],
      ['/break-even-calculator/','Break-Even Calculator','Find the sales level needed to cover fixed and variable costs.'],
      ['/guides/cash-flow-basics/','Build a cash-flow forecast','Create a practical 30–90 day view of expected money in and out.'],
      ['/business-calculators/','All business calculators','Browse the full calculator collection.']
    ]},
    website:{label:'Build or improve my website',intro:'Use AI and simple tools to launch, then capture leads when you are ready.',links:[
      ['/guides/build-business-website-cheap/','Build a website almost free','AI prompts, publishing steps and a real launch checklist.'],
      ['/guides/start-small-business/','Business launch checklist','Connect the website to your broader launch plan.'],
      ['/pro-pricing/','Capture website leads with Pro','Create lead forms that send website enquiries directly into your CRM.','pro']
    ]},
    documents:{label:'PDF, QR & document tools',intro:'Quick browser tools for common small-business document jobs.',links:[
      ['/pdf-tools/','PDF Tools','Merge, compress and convert PDFs.'],
      ['/qr-code-generator/','QR Code Generator','Create QR codes for links, menus, contact details and more.'],
      ['/tools/','All Tools','Browse every free SoloBizKit tool.']
    ]}
  };

  const searchIndex=[
    ['invoice','/invoice-generator/','Free Invoice Generator','Create and print an invoice.'],
    ['invoice software','/guides/freelance-invoice-checklist/','Invoicing setup guide','Know what to look for before paying.'],
    ['crm','/guides/simple-crm-small-business/','Small Business CRM Guide','Learn what a useful CRM should do.'],
    ['lead form','/pro-pricing/','SoloBizKit Pro Lead Forms','Website leads flow into the CRM.','pro'],
    ['customer','/pro-pricing/','SoloBizKit Pro CRM','Manage customers, estimates and invoices together.','pro'],
    ['website','/guides/build-business-website-cheap/','Build a Business Website','Use AI and simple hosting to launch.'],
    ['business','/guides/start-small-business/','Start a Small Business','Practical first-week startup plan.'],
    ['price','/guides/price-freelance-services/','Pricing Guide','Price services without guessing.'],
    ['hourly','/hourly-rate-calculator/','Hourly Rate Calculator','Estimate a sustainable hourly rate.'],
    ['margin','/profit-margin-calculator/','Profit Margin Calculator','Calculate profit margin.'],
    ['profit','/profit-margin-calculator/','Profit Margin Calculator','Calculate profit margin.'],
    ['break even','/break-even-calculator/','Break-Even Calculator','Find your break-even point.'],
    ['cash flow','/guides/cash-flow-basics/','Cash-Flow Guide','Build a 30–90 day forecast.'],
    ['estimate','/guides/write-professional-estimate/','Estimate & Quote Guide','Write a clear professional estimate.'],
    ['late payment','/guides/late-paying-clients/','Late-Payment Guide','Use a calm follow-up sequence.'],
    ['pdf','/pdf-tools/','PDF Tools','Free browser-based PDF tools.'],
    ['qr','/qr-code-generator/','QR Code Generator','Create a QR code.'],
    ['tool','/tools/','All Tools','Browse all free SoloBizKit tools.']
  ];

  function esc(value=''){
    return String(value).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[char]);
  }
  function track(name,params){
    try{if(typeof window.sbkTrack==='function')window.sbkTrack(name,params||{})}catch(_){ }
  }
  function linkMarkup(item){
    const [href,title,desc,type]=item;
    return `<a class="sbka-link${type==='pro'?' is-pro':''}" href="${href}" data-assistant-link="${type||'free'}"><strong>${esc(title)}${type==='pro'?' · Pro':''}</strong><span>${esc(desc)}</span></a>`;
  }

  const extraStyle=document.createElement('link');
  extraStyle.rel='stylesheet';
  extraStyle.href='/assistant-widget-v2.css?v=20260905-2';
  extraStyle.dataset.sbkAssistantV2Style='1';
  document.head.appendChild(extraStyle);

  const root=document.createElement('div');
  root.id='sbk-assistant-root';
  root.innerHTML=`<div class="sbka-panel" id="sbka-panel" role="dialog" aria-modal="false" aria-label="SoloBizKit Assistant"><div class="sbka-head"><div class="sbka-head-copy"><div class="sbka-mark">SB</div><div><strong>SoloBizKit Assistant</strong><span>Quick help finding the right guide, tool or Pro feature.</span></div></div><div class="sbka-head-actions"><button type="button" class="sbka-icon-btn" id="sbka-home" aria-label="Assistant home">⌂</button><button type="button" class="sbka-icon-btn" id="sbka-close" aria-label="Close assistant">×</button></div></div><div class="sbka-body" id="sbka-body"></div><div class="sbka-foot">Guided help, not an AI chat. No message content is sent to an AI service. <a href="/privacy/">Privacy</a></div></div><div class="sbka-launch-wrap"><div class="sbka-nudge" id="sbka-nudge">Need help finding something?</div><button type="button" class="sbka-launcher" id="sbka-launcher" aria-expanded="false" aria-controls="sbka-panel" aria-label="Open SoloBizKit Assistant"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5.75A3.75 3.75 0 0 1 8.75 2h6.5A3.75 3.75 0 0 1 19 5.75v6.5A3.75 3.75 0 0 1 15.25 16H11l-4.8 4.1c-.48.41-1.2.07-1.2-.56V16.1A3.75 3.75 0 0 1 5 12.25v-6.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 7.5h7M8.5 10.5h4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>`;
  document.body.appendChild(root);

  const panel=root.querySelector('#sbka-panel');
  const body=root.querySelector('#sbka-body');
  const launcher=root.querySelector('#sbka-launcher');
  const nudge=root.querySelector('#sbka-nudge');

  function renderHome(){
    body.innerHTML=`<div class="sbka-message"><strong>What are you trying to do?</strong><br>Open a topic below, then choose the exact guide, tool or Pro feature you want.</div><div class="sbka-topics">${Object.entries(journeys).map(([key,j])=>`<details class="sbka-topic" data-topic="${key}"><summary><strong>${esc(j.label)}</strong><span>${esc(j.intro)}</span></summary><div class="sbka-topic-links">${j.links.map(linkMarkup).join('')}</div></details>`).join('')}</div><form class="sbka-search" id="sbka-search" action="/tools/" method="get"><input type="search" name="q" placeholder="Search: invoice, CRM, website…" aria-label="Search SoloBizKit help"><button type="submit">Find</button></form><div class="sbka-privacy">Tip: this assistant only routes you to SoloBizKit content and features. It does not generate advice or send your text to an AI model.</div>`;
    const form=body.querySelector('#sbka-search');
    if(form)form.addEventListener('submit',(event)=>{
      event.preventDefault();
      const value=new FormData(form).get('q')||'';
      renderSearch(value);
    });
  }

  function renderSearch(raw){
    const query=String(raw).trim().toLowerCase();
    if(query.length<2){
      body.innerHTML='<div class="sbka-empty">Type at least two characters so I can find something useful.</div><button type="button" class="sbka-back" id="sbka-back">← Back</button>';
      body.querySelector('#sbka-back').onclick=renderHome;
      return;
    }
    const words=query.split(/\s+/).filter(Boolean);
    const scored=searchIndex.map((item)=>{
      const hay=(item[0]+' '+item[2]+' '+item[3]).toLowerCase();
      let score=hay.includes(query)?5:0;
      words.forEach((word)=>{if(hay.includes(word))score+=1});
      return {item,score};
    }).filter((entry)=>entry.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
    body.innerHTML=`<div class="sbka-message"><strong>Best matches for “${esc(raw)}”</strong></div>${scored.length?`<div class="sbka-results">${scored.map((entry)=>linkMarkup(entry.item.slice(1))).join('')}</div>`:'<div class="sbka-empty">I could not match that yet. Try invoice, CRM, pricing, website, cash flow, PDF or QR.</div>'}<button type="button" class="sbka-back" id="sbka-back">← Back</button>`;
    body.querySelector('#sbka-back').onclick=renderHome;
    track('assistant_search_used');
  }

  function setOpen(open){
    panel.classList.toggle('is-open',open);
    launcher.setAttribute('aria-expanded',String(open));
    if(open){
      nudge.classList.remove('is-visible');
      renderHome();
      track('assistant_opened');
      setTimeout(()=>body.querySelector('summary,input,a,button')?.focus(),40);
    }else{
      track('assistant_closed');
    }
  }

  root.addEventListener('click',(event)=>{
    const link=event.target.closest('[data-assistant-link]');
    if(link){
      track('assistant_destination_opened',{destination_path:new URL(link.href,location.href).pathname,destination_type:link.dataset.assistantLink});
      return;
    }
  });
  root.addEventListener('toggle',(event)=>{
    const topic=event.target.closest?.('.sbka-topic');
    if(topic&&topic.open)track('assistant_topic_selected',{assistant_topic:topic.dataset.topic||'unknown'});
  },true);

  launcher.addEventListener('click',()=>setOpen(!panel.classList.contains('is-open')));
  root.querySelector('#sbka-close').addEventListener('click',()=>setOpen(false));
  root.querySelector('#sbka-home').addEventListener('click',renderHome);
  document.addEventListener('keydown',(event)=>{
    if(event.key==='Escape'&&panel.classList.contains('is-open')){
      setOpen(false);
      launcher.focus();
    }
  });
  document.addEventListener('click',(event)=>{
    if(panel.classList.contains('is-open')&&!root.contains(event.target))setOpen(false);
  });

  renderHome();
  try{
    const seen=localStorage.getItem('sbk_assistant_seen');
    if(!seen){
      setTimeout(()=>{if(!panel.classList.contains('is-open'))nudge.classList.add('is-visible')},4500);
      setTimeout(()=>nudge.classList.remove('is-visible'),12000);
      localStorage.setItem('sbk_assistant_seen','1');
    }
  }catch(_){ }
})();