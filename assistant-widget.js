(function(){
  'use strict';
  if(location.pathname.startsWith('/pro/')||location.pathname.startsWith('/lead/'))return;
  if(document.getElementById('sbk-assistant-root'))return;

  const journeys={
    start:{label:'Start a business',intro:'I can point you to the practical starting steps, not just theory.',links:[
      ['/guides/start-small-business/','Start a small business','A step-by-step startup workbook with AI prompts and a first-week plan.'],
      ['/guides/build-business-website-cheap/','Build your business website','Use AI and simple tools to get a real site online without a coding background.'],
      ['/business-name-generator/','Generate a business name','Brainstorm name ideas with a free tool.']
    ]},
    invoice:{label:'Create & manage invoices',intro:'You can create one free, or use Pro when invoicing becomes recurring admin.',links:[
      ['/invoice-generator/','Create a free invoice','Build and print a professional invoice without creating an account.'],
      ['/guides/freelance-invoice-checklist/','Choose the right invoicing setup','See what matters before paying for invoice software.'],
      ['/pro-pricing/','SoloBizKit Pro invoicing','Customer records, estimates, reminders, recurring invoices and payment tracking in one workspace.','pro']
    ]},
    clients:{label:'Find & manage clients',intro:'Here are the shortest paths depending on whether you need customers or a better way to manage them.',links:[
      ['/guides/get-first-freelance-clients/','Get your first clients','Prospecting, outreach and follow-up with copy-ready templates.'],
      ['/guides/simple-crm-small-business/','Choose a CRM that earns its keep','Learn when a spreadsheet is enough and what software should actually save you from.'],
      ['/pro-pricing/','SoloBizKit Pro CRM','Keep leads, customer history, estimates, invoices and follow-ups together.','pro']
    ]},
    pricing:{label:'Price my work',intro:'Pricing is easier when you separate your minimum sustainable rate from the final customer price.',links:[
      ['/guides/price-freelance-services/','Price freelance services','Work through a practical pricing model and scope controls.'],
      ['/hourly-rate-calculator/','Hourly Rate Calculator','Estimate a sustainable hourly rate from income, costs and capacity.'],
      ['/profit-margin-calculator/','Profit Margin Calculator','Check the margin left after costs.']
    ]},
    money:{label:'Profit, cash flow & numbers',intro:'Pick the decision you are trying to make and use the matching calculator or guide.',links:[
      ['/profit-margin-calculator/','Profit Margin Calculator','Calculate profit and margin from revenue and costs.'],
      ['/break-even-calculator/','Break-Even Calculator','Find the sales level needed to cover fixed and variable costs.'],
      ['/guides/cash-flow-basics/','Build a cash-flow forecast','Create a practical 30–90 day view of expected money in and out.'],
      ['/business-calculators/','All business calculators','Browse the full calculator collection.']
    ]},
    website:{label:'Build or improve my website',intro:'You do not need to be a developer. Start with the practical guide and use AI as a working assistant.',links:[
      ['/guides/build-business-website-cheap/','Build a website almost free','AI prompts, publishing steps and a real launch checklist.'],
      ['/guides/start-small-business/','Business launch checklist','Connect the website to your broader launch plan.'],
      ['/pro-pricing/','Capture website leads with Pro','Create lead forms that send website enquiries directly into your CRM.','pro']
    ]},
    documents:{label:'PDF, QR & document tools',intro:'SoloBizKit also has quick browser tools for common business document jobs.',links:[
      ['/pdf-tools/','PDF Tools','Merge, compress and convert PDFs.'],
      ['/qr-code-generator/','QR Code Generator','Create QR codes for links, menus, contact details and more.'],
      ['/tools/','All Tools','Browse every free SoloBizKit tool.']
    ]}
  };

  const searchIndex=[
    ['invoice','/invoice-generator/','Free Invoice Generator','Create and print an invoice.'],['invoice software','/guides/freelance-invoice-checklist/','Invoicing setup guide','Know what to look for before paying.'],['crm','/guides/simple-crm-small-business/','Small Business CRM Guide','Learn what a useful CRM should do.'],['lead form','/pro-pricing/','SoloBizKit Pro Lead Forms','Website leads flow into the CRM.','pro'],['customer','/pro-pricing/','SoloBizKit Pro CRM','Manage customers, estimates and invoices together.','pro'],['website','/guides/build-business-website-cheap/','Build a Business Website','Use AI and simple hosting to launch.'],['business','/guides/start-small-business/','Start a Small Business','Practical first-week startup plan.'],['price','/guides/price-freelance-services/','Pricing Guide','Price services without guessing.'],['hourly','/hourly-rate-calculator/','Hourly Rate Calculator','Estimate a sustainable hourly rate.'],['margin','/profit-margin-calculator/','Profit Margin Calculator','Calculate profit margin.'],['profit','/profit-margin-calculator/','Profit Margin Calculator','Calculate profit margin.'],['break even','/break-even-calculator/','Break-Even Calculator','Find your break-even point.'],['cash flow','/guides/cash-flow-basics/','Cash-Flow Guide','Build a 30–90 day forecast.'],['estimate','/guides/write-professional-estimate/','Estimate & Quote Guide','Write a clear professional estimate.'],['late payment','/guides/late-paying-clients/','Late-Payment Guide','Use a calm follow-up sequence.'],['pdf','/pdf-tools/','PDF Tools','Free browser-based PDF tools.'],['qr','/qr-code-generator/','QR Code Generator','Create a QR code.'],['tool','/tools/','All Tools','Browse all free SoloBizKit tools.']
  ];

  function track(name,params){if(typeof window.sbkTrack==='function')window.sbkTrack(name,params||{})}
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c])}

  const root=document.createElement('div');root.id='sbk-assistant-root';
  root.innerHTML=`<div class="sbka-panel" id="sbka-panel" role="dialog" aria-modal="false" aria-label="SoloBizKit Assistant"><div class="sbka-head"><div class="sbka-head-copy"><div class="sbka-mark">SB</div><div><strong>SoloBizKit Assistant</strong><span>Quick help finding the right guide, tool or Pro feature.</span></div></div><div class="sbka-head-actions"><button type="button" class="sbka-icon-btn" id="sbka-home" aria-label="Assistant home">⌂</button><button type="button" class="sbka-icon-btn" id="sbka-close" aria-label="Close assistant">×</button></div></div><div class="sbka-body" id="sbka-body"></div><div class="sbka-foot">Guided help, not an AI chat. No message content is sent to an AI service. <a href="/privacy/">Privacy</a></div></div><div class="sbka-launch-wrap"><div class="sbka-nudge" id="sbka-nudge">Need help finding something?</div><button type="button" class="sbka-launcher" id="sbka-launcher" aria-expanded="false" aria-controls="sbka-panel" aria-label="Open SoloBizKit Assistant"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5.75A3.75 3.75 0 0 1 8.75 2h6.5A3.75 3.75 0 0 1 19 5.75v6.5A3.75 3.75 0 0 1 15.25 16H11l-4.8 4.1c-.48.41-1.2.07-1.2-.56V16.1A3.75 3.75 0 0 1 5 12.25v-6.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 7.5h7M8.5 10.5h4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>`;
  document.body.appendChild(root);
  const panel=root.querySelector('#sbka-panel'),body=root.querySelector('#sbka-body'),launcher=root.querySelector('#sbka-launcher'),nudge=root.querySelector('#sbka-nudge');

  function renderHome(){
    body.innerHTML=`<div class="sbka-message"><strong>What are you trying to do?</strong><br>Choose a goal and I’ll take you to the most useful place.</div><div class="sbka-choices">${Object.entries(journeys).map(([key,j])=>`<button type="button" class="sbka-choice" data-journey="${key}">${esc(j.label)}<span>${esc(j.intro)}</span></button>`).join('')}</div><form class="sbka-search" id="sbka-search"><input type="search" name="q" placeholder="Search: invoice, CRM, website…" aria-label="Search SoloBizKit help"><button type="submit">Find</button></form><div class="sbka-privacy">Tip: this assistant only routes you to SoloBizKit content and features. It does not generate advice or send your text to an AI model.</div>`;
    body.querySelectorAll('[data-journey]').forEach(btn=>btn.addEventListener('click',()=>renderJourney(btn.dataset.journey)));
    body.querySelector('#sbka-search').addEventListener('submit',e=>{e.preventDefault();renderSearch(new FormData(e.currentTarget).get('q')||'')});
  }

  function linkMarkup(item){const [href,title,desc,type]=item;return `<a class="sbka-link${type==='pro'?' is-pro':''}" href="${href}" data-assistant-link="${type||'free'}"><strong>${esc(title)}${type==='pro'?' · Pro':''}</strong><span>${esc(desc)}</span></a>`}
  function bindLinks(){body.querySelectorAll('[data-assistant-link]').forEach(a=>a.addEventListener('click',()=>track('assistant_destination_opened',{destination_path:new URL(a.href,location.href).pathname,destination_type:a.dataset.assistantLink}))) }

  function renderJourney(key){
    const j=journeys[key];if(!j)return renderHome();
    body.innerHTML=`<div class="sbka-message"><strong>${esc(j.label)}</strong><br>${esc(j.intro)}</div><div class="sbka-results"><div class="sbka-result-title">Recommended next steps</div>${j.links.map(linkMarkup).join('')}</div><button type="button" class="sbka-back">← Back to all topics</button>`;
    body.querySelector('.sbka-back').onclick=renderHome;bindLinks();track('assistant_topic_selected',{assistant_topic:key});
  }

  function renderSearch(raw){
    const q=String(raw).trim().toLowerCase();
    if(q.length<2){body.innerHTML='<div class="sbka-empty">Type at least two characters so I can find something useful.</div><button type="button" class="sbka-back">← Back</button>';body.querySelector('.sbka-back').onclick=renderHome;return}
    const words=q.split(/\s+/).filter(Boolean);
    const scored=searchIndex.map(item=>{const hay=(item[0]+' '+item[2]+' '+item[3]).toLowerCase();let score=0;if(hay.includes(q))score+=5;words.forEach(w=>{if(hay.includes(w))score+=1});return{item,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
    body.innerHTML=`<div class="sbka-message"><strong>Best matches for “${esc(raw)}”</strong></div>${scored.length?`<div class="sbka-results">${scored.map(x=>linkMarkup(x.item.slice(1).concat(x.item[4]||''))).join('')}</div>`:'<div class="sbka-empty">I could not match that yet. Try words like invoice, CRM, pricing, website, cash flow, PDF or QR.</div>'}<button type="button" class="sbka-back">← Back</button>`;
    body.querySelector('.sbka-back').onclick=renderHome;bindLinks();track('assistant_search_used');
  }

  function setOpen(open){panel.classList.toggle('is-open',open);launcher.setAttribute('aria-expanded',String(open));if(open){nudge.classList.remove('is-visible');renderHome();track('assistant_opened');setTimeout(()=>body.querySelector('button,input,a')?.focus(),50)}else{track('assistant_closed')}}
  launcher.addEventListener('click',()=>setOpen(!panel.classList.contains('is-open')));
  root.querySelector('#sbka-close').onclick=()=>setOpen(false);root.querySelector('#sbka-home').onclick=renderHome;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('is-open')){setOpen(false);launcher.focus()}});
  document.addEventListener('click',e=>{if(panel.classList.contains('is-open')&&!root.contains(e.target))setOpen(false)});

  renderHome();
  try{
    const seen=localStorage.getItem('sbk_assistant_seen');
    if(!seen){setTimeout(()=>{if(!panel.classList.contains('is-open'))nudge.classList.add('is-visible')},4500);setTimeout(()=>nudge.classList.remove('is-visible'),12000);localStorage.setItem('sbk_assistant_seen','1')}
  }catch(_){ }
})();