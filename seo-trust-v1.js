// SoloBizKit SEO trust + priority landing-page layer
// Adds visible trust signals and concentrates internal linking on the pages
// most likely to earn early organic search visibility.
(function () {
  const REVIEWED = 'September 5, 2026';
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

  function addStyles() {
    if (document.getElementById('sbk-seo-trust-style')) return;
    const style = document.createElement('style');
    style.id = 'sbk-seo-trust-style';
    style.textContent = `
      .sbk-seo-trust{background:#fff;border-top:1px solid #e3e1da;border-bottom:1px solid #e3e1da;padding:44px 0;margin:0}
      .sbk-seo-trust-inner{width:min(1080px,calc(100% - 30px));margin:auto}
      .sbk-seo-trust .sbk-eyebrow{display:block;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#3f6b55;margin-bottom:7px}
      .sbk-seo-trust h2{font-size:clamp(26px,4vw,36px);letter-spacing:-.035em;margin:0 0 10px;color:#252823}
      .sbk-seo-trust .sbk-lead{max-width:820px;color:#6f746c;line-height:1.7;margin:0 0 20px}
      .sbk-trust-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}
      .sbk-trust-card{border:1px solid #e3e1da;border-radius:14px;padding:16px;background:#faf9f6}
      .sbk-trust-card strong{display:block;margin-bottom:5px;color:#252823}
      .sbk-trust-card span{display:block;color:#6f746c;font-size:13px;line-height:1.55}
      .sbk-trust-links,.sbk-priority-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
      .sbk-trust-links a,.sbk-priority-grid a{display:block;border:1px solid #e3e1da;border-radius:12px;padding:13px 14px;text-decoration:none;background:#fff;color:#3f6b55;font-weight:850}
      .sbk-priority-grid a span{display:block;color:#6f746c;font-size:12px;font-weight:500;line-height:1.45;margin-top:4px}
      .sbk-reviewed{font-size:12px;color:#74796f;margin-top:14px}
      .sbk-footer-trust{display:flex;flex-wrap:wrap;gap:8px 13px;align-items:center;justify-content:center;margin-top:10px;font-size:12px}
      .sbk-footer-trust a{color:inherit;text-decoration:none;font-weight:750}
      .sbk-footer-trust a:hover{text-decoration:underline}
      @media(max-width:760px){.sbk-trust-grid,.sbk-trust-links,.sbk-priority-grid{grid-template-columns:1fr}.sbk-seo-trust{padding:34px 0}}
    `;
    document.head.appendChild(style);
  }

  function makePrioritySection(hub) {
    const section = document.createElement('section');
    section.className = 'sbk-seo-trust';
    section.id = 'priority-tools';
    section.innerHTML = `
      <div class="sbk-seo-trust-inner">
        <span class="sbk-eyebrow">Priority tools</span>
        <h2>${hub === 'home' ? 'Start with the business tools people need most.' : 'Recommended starting points'}</h2>
        <p class="sbk-lead">These are the SoloBizKit tools we keep most tightly reviewed because they solve common pricing, finance, invoicing, PDF and QR tasks.</p>
        <div class="sbk-priority-grid">
          ${PRIORITY.map(([href, name, description]) => `<a href="${href}">${name}<span>${description}</span></a>`).join('')}
        </div>
        <p class="sbk-reviewed">Priority set reviewed ${REVIEWED}. Browse <a href="/tools/">all tools</a> for the complete directory.</p>
      </div>`;
    return section;
  }

  function makeTrustSection() {
    const section = document.createElement('section');
    section.className = 'sbk-seo-trust';
    section.id = 'trust-and-methodology';
    section.innerHTML = `
      <div class="sbk-seo-trust-inner">
        <span class="sbk-eyebrow">Transparent by design</span>
        <h2>Why you can trust this SoloBizKit tool</h2>
        <p class="sbk-lead">We document what the tool does, the assumptions or technical limits that matter, and where a simple browser tool should not be treated as professional advice or a perfect conversion.</p>
        <div class="sbk-trust-grid">
          <div class="sbk-trust-card"><strong>Method is visible</strong><span>Business calculators use deterministic formulas, while document tools explain what is preserved, changed or unsupported.</span></div>
          <div class="sbk-trust-card"><strong>Privacy boundaries are stated</strong><span>Calculator values stay in the browser, and local-processing tools clearly describe when files are handled on your device.</span></div>
          <div class="sbk-trust-card"><strong>Corrections are welcome</strong><span>Broken behavior, unclear assumptions and reproducible errors can be reported so the affected tool can be reviewed.</span></div>
        </div>
        <div class="sbk-trust-links">
          <a href="/methodology/">Calculator methodology →</a>
          <a href="/about/">How SoloBizKit works →</a>
          <a href="/privacy/">Privacy policy →</a>
          <a href="/contact/">Report a problem →</a>
          <a href="/terms/">Terms & limitations →</a>
          <a href="/tools/">Browse all tools →</a>
        </div>
        <p class="sbk-reviewed">Trust and landing-page review updated ${REVIEWED}.</p>
      </div>`;
    return section;
  }

  function relatedForCurrent(path) {
    const items = PRIORITY.filter(item => item[0] !== path).slice(0, 6);
    const section = document.createElement('section');
    section.className = 'sbk-seo-trust';
    section.setAttribute('aria-label', 'Related priority tools');
    section.innerHTML = `
      <div class="sbk-seo-trust-inner">
        <span class="sbk-eyebrow">Continue the workflow</span>
        <h2>Related free business tools</h2>
        <div class="sbk-priority-grid">
          ${items.map(([href, name, description]) => `<a href="${href}">${name}<span>${description}</span></a>`).join('')}
        </div>
      </div>`;
    return section;
  }

  function installFooterTrust() {
    const footer = document.querySelector('.sbk-global-footer');
    if (!footer || footer.querySelector('.sbk-footer-trust')) return;
    const inner = footer.querySelector('.sbk-global-footer-inner') || footer;
    const nav = document.createElement('nav');
    nav.className = 'sbk-footer-trust';
    nav.setAttribute('aria-label', 'Trust and site information');
    nav.innerHTML = '<a href="/about/">About</a><a href="/methodology/">Methodology</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a>';
    inner.appendChild(nav);
  }

  function install() {
    addStyles();
    installFooterTrust();
    const path = location.pathname;
    const main = document.querySelector('main');
    if (!main) return;

    if ((path === '/' || path === '/tools/') && !document.getElementById('priority-tools')) {
      main.appendChild(makePrioritySection(path === '/' ? 'home' : 'tools'));
    }

    if (priorityPaths.has(path) && !document.getElementById('trust-and-methodology')) {
      main.appendChild(makeTrustSection());
      main.appendChild(relatedForCurrent(path));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
