(function(){
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
          <span class="home-badge">FREE TOOLS + A PRO WORKSPACE FOR SOLO BUSINESSES</span>
          <h1>Run your solo business from one practical toolkit.</h1>
          <p>Use free calculators, invoice and PDF tools when you need a quick answer. Move into SoloBizKit Pro when you want customers, estimates, recurring invoices and payments in one private workspace.</p>
          <div class="home-actions">
            <a class="primary" href="#popular">Explore free tools</a>
            <a class="secondary pro" href="/pro-pricing/">See SoloBizKit Pro</a>
          </div>
          <div class="hero-proof"><span>✓ No signup for free tools</span><span>✓ 14-day Pro trial</span><span>✓ Built for freelancers & solo operators</span></div>
        </div>
        <aside class="hero-product" aria-label="SoloBizKit Pro workflow preview">
          <div class="hero-product-head"><strong>SoloBizKit Pro</strong><span>WORKSPACE</span></div>
          <div class="hero-product-stats"><div class="hero-product-stat"><small>CUSTOMERS</small><b>24</b></div><div class="hero-product-stat"><small>OUTSTANDING</small><b>€4,280</b></div></div>
          <div class="hero-product-flow"><div><i>1</i><span>Add customer</span><em>CRM</em></div><div><i>2</i><span>Send estimate</span><em>QUOTE</em></div><div><i>3</i><span>Create invoice</span><em>BILL</em></div><div><i>4</i><span>Get paid</span><em>STRIPE</em></div></div>
        </aside>
        <div class="home-search"><span>⌕</span><input id="toolSearch" type="search" placeholder="Search free tools: profit margin, invoice, compress PDF…" aria-label="Search free SoloBizKit tools" autocomplete="off"></div>
        <nav class="category-chips home-filters" aria-label="Tool categories"><a href="/tools/">All free tools</a><a href="/business-calculators/">Calculators</a><a href="/invoice-generator/">Invoices</a><a href="/pdf-tools/">PDF & documents</a><a href="/qr-code-generator/">QR codes</a></nav>`;
    }

    const quick=document.querySelector('.quick');
    if(quick && !document.querySelector('.product-choice')){
      const section=document.createElement('section'); section.className='product-choice';
      section.innerHTML=`<div class="wrap"><div class="product-choice-grid">
        <article class="product-choice-card"><small>FREE TOOLKIT</small><h2>Need to finish one task?</h2><p>Open a calculator or document tool instantly. No account, no trial and no setup.</p><ul class="product-choice-points"><li>✓ Business calculators</li><li>✓ Invoice generator</li><li>✓ PDF and QR tools</li></ul><a href="/tools/">Browse all free tools →</a></article>
        <article class="product-choice-card pro"><small>SOLOBIZKIT PRO</small><h2>Need to run the workflow?</h2><p>Keep customers, estimates, invoices, recurring billing and payments together instead of rebuilding the same admin every week.</p><ul class="product-choice-points"><li>✓ CRM & customer history</li><li>✓ Estimates → invoices</li><li>✓ Recurring billing & Stripe payments</li></ul><a href="/pro-pricing/">Start 14-day Pro trial</a></article>
      </div></div>`;
      quick.parentNode.insertBefore(section, quick);
    }

    const q=document.getElementById('toolSearch'), cards=[...document.querySelectorAll('.searchable')], none=document.getElementById('noResults');
    if(q && cards.length){
      q.oninput=function(){const term=(q.value||'').trim().toLowerCase();let visible=0;cards.forEach(card=>{const text=(card.textContent+' '+(card.dataset.keywords||'')).toLowerCase();const show=!term||text.includes(term);card.hidden=!show;if(show)visible++});if(none)none.style.display=visible?'none':'block'};
    }
  });
})();