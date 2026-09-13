// SoloBizKit SEO trust, internal linking and worked-scenario layer
(function () {
  const REVIEWED = 'September 13, 2026';
  const PRIORITY = [
    ['/profit-margin-calculator/', 'Profit Margin Calculator', 'Pricing, margin and markup'],
    ['/break-even-calculator/', 'Break-Even Calculator', 'Units and revenue needed to cover costs'],
    ['/business-loan-calculator/', 'Business Loan Calculator', 'Payments, interest and payoff time'],
    ['/hourly-rate-calculator/', 'Hourly Rate Calculator', 'Sustainable freelance and consulting rates'],
    ['/invoice-generator/', 'Free Invoice Generator', 'Create, review and save a client invoice'],
    ['/pdf-to-word/', 'PDF to Word', 'Convert selectable PDF text to DOCX'],
    ['/compress-pdf/', 'Compress PDF', 'Reduce PDF file size in your browser'],
    ['/merge-pdf/', 'Merge PDF', 'Combine PDF files in the order you choose'],
    ['/qr-code-generator/', 'QR Code Generator', 'URL, Wi-Fi, text, email, PNG and SVG']
  ];
  const priorityPaths = new Set(PRIORITY.map(item => item[0]));
  const SCENARIOS = {
    '/profit-margin-calculator/': {
      title: 'Profit margin examples at different selling prices',
      intro: 'These examples use the same 40 unit cost so you can see how price changes affect both markup and margin.',
      columns: ['Cost', 'Selling price', 'Profit', 'Markup', 'Margin'],
      rows: [['40','60','20','50%','33.3%'],['40','80','40','100%','50%'],['40','100','60','150%','60%']],
      note: 'Markup and margin use different denominators. A 100% markup on a cost of 40 produces a selling price of 80, but the resulting margin is 50%.',
      href: '/break-even-calculator/', label: 'Next: check how many sales are needed to cover fixed costs →'
    },
    '/break-even-calculator/': {
      title: 'How price changes the break-even point',
      intro: 'Assume fixed costs of 5,000 and variable cost of 20 per unit. A higher selling price increases contribution per sale and lowers the number of units required to break even.',
      columns: ['Selling price', 'Contribution / unit', 'Break-even units', 'Approx. revenue'],
      rows: [['40','20','250','10,000'],['50','30','167','8,350'],['60','40','125','7,500']],
      note: 'The lowest break-even revenue does not automatically mean the best price. Demand, capacity, competition and customer value still matter.',
      href: '/profit-margin-calculator/', label: 'Next: compare the margin at your planned price →'
    },
    '/business-loan-calculator/': {
      title: 'Compare the same business loan at different interest rates',
      intro: 'Example: a 50,000 fixed-rate loan repaid over five years with no extra payments or fees.',
      columns: ['Interest rate', 'Monthly payment', 'Total interest', 'Term'],
      rows: [['5%','943.56','6,613.70','60 months'],['7.5%','1,001.90','10,113.85','60 months'],['10%','1,062.35','13,741.13','60 months']],
      note: 'A few percentage points can materially change total borrowing cost. Compare lender fees and APR as well as the headline rate before choosing an offer.',
      href: '/cash-flow-calculator/', label: 'Next: test whether the payment fits your monthly cash flow →'
    },
    '/hourly-rate-calculator/': {
      title: 'Why billable time changes the hourly rate you need',
      intro: 'Example: 80,000 desired personal income, 12,000 annual business expenses, five weeks off, 40 working hours per week and a 15% safety buffer.',
      columns: ['Billable time', 'Billable hours / year', 'Target hourly rate', '8-hour day equivalent'],
      rows: [['50%','940','112.55','900.43'],['60%','1,128','93.79','750.35'],['70%','1,316','80.40','643.16']],
      note: 'Using every working hour as billable usually understates the rate required. Sales, admin, bookkeeping and gaps between projects still consume time.',
      href: '/invoice-generator/', label: 'Next: turn an agreed rate into a client invoice →'
    }
  };

  function addStyles() {
    if (!document.getElementById('sbk-seo-trust-style')) {
      const style = document.createElement('style');
      style.id = 'sbk-seo-trust-style';
      style.textContent = `
        .sbk-seo-trust{background:#fff;border-top:1px solid #dbe5f2;border-bottom:1px solid #dbe5f2;padding:44px 0;margin:0}.sbk-seo-trust-inner{width:min(1080px,calc(100% - 30px));margin:auto}.sbk-seo-trust .sbk-eyebrow{display:block;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#2457f5;margin-bottom:7px}.sbk-seo-trust h2{font-size:clamp(26px,4vw,36px);letter-spacing:-.035em;margin:0 0 10px;color:#081431}.sbk-seo-trust .sbk-lead{max-width:820px;color:#5f6f8d;line-height:1.7;margin:0 0 20px}.sbk-trust-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.sbk-trust-card{border:1px solid #dbe5f2;border-radius:14px;padding:16px;background:#f8faff}.sbk-trust-card strong{display:block;margin-bottom:5px;color:#081431}.sbk-trust-card span{display:block;color:#5f6f8d;font-size:13px;line-height:1.55}.sbk-trust-links,.sbk-priority-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}.sbk-trust-links a,.sbk-priority-grid a{display:block;border:1px solid #dbe5f2;border-radius:12px;padding:13px 14px;text-decoration:none;background:#fff;color:#1744d2;font-weight:850}.sbk-priority-grid a span{display:block;color:#5f6f8d;font-size:12px;font-weight:500;line-height:1.45;margin-top:4px}.sbk-guides-cta{margin:22px 0 0;padding:17px 18px;border:1px solid #cbdcff;border-radius:14px;background:#eef4ff;color:#52627e;line-height:1.65}.sbk-guides-cta strong{color:#081431}.sbk-reviewed{font-size:12px;color:#7183a4;margin-top:14px}.sbk-footer-trust{display:flex;flex-wrap:wrap;gap:8px 13px;align-items:center;justify-content:center;margin-top:10px;font-size:12px}.sbk-footer-trust a{color:#9fb0cc;text-decoration:none;font-weight:750}
        @media(max-width:760px){.sbk-trust-grid,.sbk-trust-links,.sbk-priority-grid{grid-template-columns:1fr}.sbk-seo-trust{padding:34px 0}}
      `;
      document.head.appendChild(style);
    }
    if (SCENARIOS[location.pathname] && !document.querySelector('link[data-scenario-style]')) {
      const link = document.createElement('link'); link.rel='stylesheet'; link.href='/seo-scenario-examples.css?v=20260913-1'; link.dataset.scenarioStyle='1'; document.head.appendChild(link);
    }
  }

  function makePrioritySection(hub) {
    const section=document.createElement('section'); section.className='sbk-seo-trust'; section.id='priority-tools';
    section.innerHTML=`<div class="sbk-seo-trust-inner"><span class="sbk-eyebrow">Priority tools</span><h2>${hub==='home'?'Start with the business tools people need most.':'Recommended starting points'}</h2><p class="sbk-lead">These are the SoloBizKit tools we keep most tightly reviewed because they solve common pricing, finance, invoicing, PDF and QR tasks.</p><div class="sbk-priority-grid">${PRIORITY.map(([href,name,description])=>`<a href="${href}">${name}<span>${description}</span></a>`).join('')}</div><div class="sbk-guides-cta"><strong>New to freelancing or running a small business?</strong> Visit the <a href="/guides/">SoloBizKit Guides</a> for practical help with starting up, finding clients, pricing, invoicing, CRM and cash flow.</div><p class="sbk-reviewed">Priority set reviewed ${REVIEWED}. Browse <a href="/tools/">all tools</a> for the complete directory.</p></div>`; return section;
  }
  function makeTrustSection(){const section=document.createElement('section');section.className='sbk-seo-trust';section.id='trust-and-methodology';section.innerHTML=`<div class="sbk-seo-trust-inner"><span class="sbk-eyebrow">Transparent by design</span><h2>Why you can trust this SoloBizKit tool</h2><p class="sbk-lead">We document what the tool does, the assumptions or technical limits that matter, and where a simple browser tool should not be treated as professional advice.</p><div class="sbk-trust-grid"><div class="sbk-trust-card"><strong>Method is visible</strong><span>Business calculators use deterministic formulas and explain the assumptions behind them.</span></div><div class="sbk-trust-card"><strong>Privacy boundaries are stated</strong><span>Calculator values stay in the browser, and local-processing tools describe how files are handled.</span></div><div class="sbk-trust-card"><strong>Corrections are welcome</strong><span>Broken behavior and reproducible errors can be reported for review.</span></div></div><div class="sbk-trust-links"><a href="/methodology/">Calculator methodology →</a><a href="/guides/">Small business guides →</a><a href="/about/">How SoloBizKit works →</a><a href="/privacy/">Privacy policy →</a><a href="/security/">Security & data processing →</a><a href="/contact/">Report a problem →</a></div><p class="sbk-reviewed">Trust and landing-page review updated ${REVIEWED}.</p></div>`;return section}
  function relatedForCurrent(path){const items=PRIORITY.filter(item=>item[0]!==path).slice(0,6),section=document.createElement('section');section.className='sbk-seo-trust';section.setAttribute('aria-label','Related priority tools');section.innerHTML=`<div class="sbk-seo-trust-inner"><span class="sbk-eyebrow">Continue the workflow</span><h2>Related free business tools</h2><div class="sbk-priority-grid">${items.map(([href,name,description])=>`<a href="${href}">${name}<span>${description}</span></a>`).join('')}</div></div>`;return section}
  function scenarioSection(path){const s=SCENARIOS[path];if(!s)return null;const section=document.createElement('section');section.className='scenario-examples';section.id='worked-scenarios';section.innerHTML=`<div class="scenario-wrap"><h2>${s.title}</h2><p>${s.intro}</p><div class="scenario-table-wrap"><table class="scenario-table"><thead><tr>${s.columns.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${s.rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="scenario-note">${s.note}</p><a class="scenario-next" href="${s.href}">${s.label}</a></div>`;return section}
  function installFooterTrust(){const footer=document.querySelector('.sbk-global-footer');if(!footer||footer.querySelector('.sbk-footer-trust'))return;const inner=footer.querySelector('.sbk-global-footer-inner')||footer,nav=document.createElement('nav');nav.className='sbk-footer-trust';nav.setAttribute('aria-label','Trust and site information');nav.innerHTML='<a href="/guides/">Guides</a><a href="/about/">About</a><a href="/methodology/">Methodology</a><a href="/security/">Security</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a>';inner.appendChild(nav)}
  function install(){addStyles();installFooterTrust();const path=location.pathname,main=document.querySelector('main');if(!main)return;if((path==='/'||path==='/tools/')&&!document.getElementById('priority-tools'))main.appendChild(makePrioritySection(path==='/'?'home':'tools'));if(SCENARIOS[path]&&!document.getElementById('worked-scenarios')){const trust=document.getElementById('trust-and-methodology');const scenario=scenarioSection(path);if(trust)main.insertBefore(scenario,trust);else main.appendChild(scenario)}if(priorityPaths.has(path)&&!document.getElementById('trust-and-methodology')){main.appendChild(makeTrustSection());main.appendChild(relatedForCurrent(path))}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
