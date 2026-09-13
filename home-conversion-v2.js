(function(){
  if(document.querySelector('script[data-sbk-site-parity]')||window.sbkSiteParity)return;
  if(location.pathname !== '/') return;
  function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true}); else fn(); }
  ready(function(){
    if(document.querySelector('[data-home-v2]')) return;
    document.documentElement.dataset.homeV2 = 'true';
    const css=document.createElement('link'); css.rel='stylesheet'; css.href='/home-conversion-v2.css'; document.head.appendChild(css);

    const hero=document.querySelector('.home-hero .wrap');
    if(hero){
      hero.dataset.homeV2='true';
      hero.innerHTML=`
        <div class="hero-copy">
          <span class="home-badge">FREE BUSINESS TOOLS + OPTIONAL PRO WORKSPACE</span>
          <h1>Run the numbers. Finish the work.</h1>
          <p>Use free calculators, invoicing and document tools for everyday business tasks. When you need more, move into Pro for customers, estimates, recurring invoices and payments.</p>
          <div class="home-actions">
            <a class="primary" href="#common-business-tasks">Start with a business task</a>
            <a class="secondary pro" href="/pro-pricing/">See SoloBizKit Pro</a>
          </div>
          <div class="hero-proof"><span>✓ No signup for free tools</span><span>✓ Clear formulas and practical outputs</span><span>✓ Built for freelancers and small businesses</span></div>
        </div>
        <aside class="hero-product" aria-label="SoloBizKit Pro workflow preview">
          <div class="hero-product-head"><strong>SoloBizKit Pro</strong><span>WORKSPACE</span></div>
          <div class="hero-product-stats"><div class="hero-product-stat"><small>CUSTOMERS</small><b>24</b></div><div class="hero-product-stat"><small>OUTSTANDING</small><b>€4,280</b></div></div>
          <div class="hero-product-flow"><div><i>1</i><span>Add customer</span><em>CRM</em></div><div><i>2</i><span>Send estimate</span><em>QUOTE</em></div><div><i>3</i><span>Create invoice</span><em>BILL</em></div><div><i>4</i><span>Get paid</span><em>BANK / STRIPE</em></div></div>
        </aside>
        <div class="home-search"><span>⌕</span><input id="toolSearch" type="search" placeholder="Search free tools: profit margin, business loan, invoice, compress PDF…" aria-label="Search free SoloBizKit tools" autocomplete="off"></div>
        <nav class="category-chips home-filters" aria-label="Tool categories"><a href="/tools/">All free tools</a><a href="/business-calculators/">Calculators</a><a href="/invoice-generator/">Invoices</a><a href="/pdf-tools/">PDF & documents</a><a href="/qr-code-generator/">QR codes</a></nav>`;
    }

    const quick=document.querySelector('.quick');
    if(quick && !document.querySelector('.product-choice')){
      const section=document.createElement('section'); section.className='product-choice';
      section.innerHTML=`<div class="wrap"><div class="product-choice-grid">
        <article class="product-choice-card"><small>FREE TOOLKIT</small><h2>Need to finish one task?</h2><p>Open a calculator or document tool instantly. No account, no trial and no setup.</p><ul class="product-choice-points"><li>✓ Business calculators</li><li>✓ Invoice generator</li><li>✓ PDF and QR tools</li></ul><a href="/tools/">Browse all free tools →</a></article>
        <article class="product-choice-card pro"><small>SOLOBIZKIT PRO</small><h2>Ready to run more of the business?</h2><p>Keep customers, estimates, invoices, recurring billing and payments together in one workspace that can follow you from solo operator to growing business.</p><ul class="product-choice-points"><li>✓ CRM & customer history</li><li>✓ Estimates → invoices</li><li>✓ Recurring billing & bank / Stripe payments</li></ul><a href="/pro-pricing/">Start 14-day Pro trial</a></article>
      </div></div>`;
      quick.parentNode.insertBefore(section, quick);
    }

    if(quick && !document.getElementById('common-business-tasks')){
      const tasks=document.createElement('section'); tasks.className='home-task-paths'; tasks.id='common-business-tasks';
      tasks.innerHTML=`<div class="wrap">
        <div class="task-paths-head"><span class="task-kicker">COMMON BUSINESS QUESTIONS</span><h2>Start with the problem you need to solve</h2><p>Jump straight to a focused tool, see the formula behind the result, and continue to the next useful step.</p></div>
        <div class="task-path-grid">
          <a href="/profit-margin-calculator/"><small>PRICING</small><strong>Is this price actually profitable?</strong><span>Calculate profit, margin, markup and the selling price needed for a target margin.</span><b>Check profit margin →</b></a>
          <a href="/break-even-calculator/"><small>PROFITABILITY</small><strong>How much do I need to sell to break even?</strong><span>Turn fixed costs, price and variable cost into a clear sales target.</span><b>Find break-even →</b></a>
          <a href="/business-loan-calculator/"><small>FINANCE</small><strong>What will a business loan really cost?</strong><span>Estimate monthly payment, total interest, payoff time and extra-payment savings.</span><b>Estimate loan cost →</b></a>
          <a href="/hourly-rate-calculator/"><small>FREELANCE</small><strong>What hourly rate should I charge?</strong><span>Work backwards from income, expenses, billable time and tax to a sustainable rate.</span><b>Calculate hourly rate →</b></a>
          <a href="/cash-flow-calculator/"><small>CASH FLOW</small><strong>How long will my cash last?</strong><span>Project monthly net cash, closing balance and runway from a simple scenario.</span><b>Project cash flow →</b></a>
          <a href="/invoice-generator/"><small>GET PAID</small><strong>How do I turn the work into an invoice?</strong><span>Create a professional client invoice and save or print it as a PDF.</span><b>Create an invoice →</b></a>
        </div>
      </div>`;
      quick.parentNode.insertBefore(tasks, quick);
    }

    const q=document.getElementById('toolSearch'), cards=[...document.querySelectorAll('.searchable')], none=document.getElementById('noResults');
    if(q && cards.length){
      q.oninput=function(){const term=(q.value||'').trim().toLowerCase();let visible=0;cards.forEach(card=>{const text=(card.textContent+' '+(card.dataset.keywords||'')).toLowerCase();const show=!term||text.includes(term);card.hidden=!show;if(show)visible++});if(none)none.style.display=visible?'none':'block'};
    }
  });
})();