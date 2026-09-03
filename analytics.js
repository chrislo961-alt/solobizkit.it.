// SoloBizKit analytics + quality layer
// GA4 Measurement ID: G-HQQWQXMQ99
(function(){
  const GA_ID='G-HQQWQXMQ99';
  const CONSENT_KEY='solobizkit_analytics_consent';
  const state={searchTracked:false,errorShown:false};
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){dataLayer.push(arguments)};

  gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});

  function loadGA(){
    if(document.querySelector('script[data-solobizkit-ga]'))return;
    const s=document.createElement('script');
    s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;s.dataset.solobizkitGa='1';
    document.head.appendChild(s);
    gtag('js',new Date());
    gtag('config',GA_ID,{anonymize_ip:true,send_page_view:true});
  }
  function granted(){return localStorage.getItem(CONSENT_KEY)==='granted'}
  function updateConsent(value){
    const yes=value==='granted';
    gtag('consent','update',{analytics_storage:yes?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    localStorage.setItem(CONSENT_KEY,value);
    if(yes)loadGA();
  }
  function banner(){
    if(localStorage.getItem(CONSENT_KEY))return;
    const box=document.createElement('div');box.id='sbk-consent';
    box.innerHTML='<div class="sbk-consent-inner"><div><strong>Optional analytics</strong><p>We use optional Google Analytics cookies to learn which tools are useful. We do not send the values you type into tools as analytics event data.</p></div><div class="sbk-consent-actions"><button id="sbk-decline" type="button">Decline</button><button id="sbk-accept" type="button">Accept analytics</button></div></div>';
    document.body.appendChild(box);
    document.getElementById('sbk-accept').onclick=function(){updateConsent('granted');box.remove()};
    document.getElementById('sbk-decline').onclick=function(){updateConsent('denied');box.remove()};
  }
  if(granted()){gtag('consent','update',{analytics_storage:'granted'});loadGA()}

  // Never pass form values, filenames, QR contents, invoice contents or search text here.
  window.sbkTrack=function(eventName,params){if(!granted())return;gtag('event',eventName,Object.assign({page_path:location.pathname,page_title:document.title},params||{}))};
  window.sbkComplete=function(tool,extra){window.sbkTrack('tool_complete',Object.assign({tool_name:tool},extra||{}))};

  function classifyAction(el){
    const id=el.id||'',text=(el.textContent||'').trim().toLowerCase();
    if(id==='png'||/download png/.test(text))return 'qr_download_png';
    if(id==='svg'||/download svg/.test(text))return 'qr_download_svg';
    if(id==='printBtn'||/print \/ save pdf/.test(text))return 'invoice_print_pdf';
    if(id==='convert'||/convert to word/.test(text))return 'pdf_convert_start';
    if(id==='copy'||/^copy/.test(text))return 'copy_result';
    if(/calculate/.test(text))return 'calculator_action';
    if(/download/.test(text))return 'download_action';
    if(/generate|create/.test(text))return 'generate_action';
    return null;
  }
  document.addEventListener('click',function(e){
    const el=e.target.closest('a,button');if(!el)return;
    const href=el.getAttribute('href')||'',category=el.dataset&&el.dataset.filter;
    if(category)window.sbkTrack('tool_filter',{filter_name:category});
    const routes=[['/pdf-to-word/','open_pdf_tool'],['/qr-code-generator/','open_qr_tool'],['/invoice-generator/','open_invoice_tool'],['/business-name-generator/','open_name_generator'],['/paycheck-calculator/','open_paycheck_calculator'],['/hourly-rate-calculator/','open_rate_calculator'],['/profit-margin-calculator/','open_profit_calculator'],['/break-even-calculator/','open_break_even_calculator'],['/tools/','open_tools_directory'],['/pro-pricing/','pro_pricing_opened'],['/pro/','pro_workspace_opened']];
    routes.forEach(([route,event])=>{if(href.includes(route))window.sbkTrack(event)});
    const action=classifyAction(el);if(action)window.sbkTrack(action);
  });
  document.addEventListener('input',function(e){const el=e.target;if(el&&el.id==='toolSearch'&&!state.searchTracked&&String(el.value||'').length>1){state.searchTracked=true;window.sbkTrack('tool_search_used')}});
  document.addEventListener('change',function(e){const el=e.target;if(el&&el.type==='file'&&el.files)window.sbkTrack('file_selected',{file_count:Math.min(el.files.length,20)})});

  function showDependencyError(){
    if(state.errorShown||document.getElementById('sbk-quality-error'))return;state.errorShown=true;
    const box=document.createElement('div');box.id='sbk-quality-error';box.setAttribute('role','status');
    box.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:99998;max-width:620px;margin:auto;background:#f4f8ff;border:1px solid #bfd4ff;border-radius:12px;padding:12px 14px;color:#334a70;font:13px/1.45 system-ui;box-shadow:0 12px 30px rgba(37,99,235,.10)';
    box.innerHTML='<strong>A required tool component did not load.</strong><br>Check your connection and reload the page.<button type="button" aria-label="Close" style="float:right;border:0;background:transparent;font-size:18px;cursor:pointer">×</button>';
    box.querySelector('button').onclick=()=>box.remove();document.body.appendChild(box);
  }
  function resourceUrl(target){return String((target&&target.src)||(target&&target.href)||'')}
  function isRequiredToolDependency(url){return ['pdf-lib','pdf.min.mjs','pdf.worker.min.mjs','pdf-decrypt','qrcode','docx','xlsx','jszip'].some(name=>url.toLowerCase().includes(name))}
  window.addEventListener('error',function(e){const t=e.target;if(!(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK')))return;const url=resourceUrl(t);if(isRequiredToolDependency(url))showDependencyError();let host='external';try{host=new URL(url,location.href).hostname}catch(_){}window.sbkTrack('dependency_load_error',{resource_host:host,required_tool_dependency:isRequiredToolDependency(url)})},true);
  window.addEventListener('unhandledrejection',function(){window.sbkTrack('tool_runtime_error')});

  // Keep PDFs compatible with older Acrobat versions by disabling object streams.
  function installPdfCompatibility(){
    const lib=window.PDFLib;if(!lib||!lib.PDFDocument||!lib.PDFDocument.prototype)return false;
    const proto=lib.PDFDocument.prototype;if(proto.__sbkAcrobatCompatible)return true;
    const originalSave=proto.save;proto.save=function(options){return originalSave.call(this,Object.assign({},options||{},{useObjectStreams:false}))};
    Object.defineProperty(proto,'__sbkAcrobatCompatible',{value:true});return true;
  }
  if(!installPdfCompatibility()){document.addEventListener('DOMContentLoaded',installPdfCompatibility,{once:true});window.addEventListener('load',installPdfCompatibility,{once:true})}

  function installProEntry(){
    if(location.pathname.startsWith('/pro/')||location.pathname.startsWith('/pro-pricing/'))return;
    const nav=document.querySelector('.sbk-global-nav');if(!nav||nav.querySelector('[data-pro-entry]'))return;
    const existing=nav.querySelector('.sbk-global-tools');
    const link=document.createElement('a');link.href='/pro-pricing/';link.dataset.proEntry='true';link.textContent='Pro';link.setAttribute('aria-label','Learn about SoloBizKit Pro');
    link.style.cssText='display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:9px;background:#2563eb;color:#fff;text-decoration:none;font-size:13px;font-weight:800;white-space:nowrap';
    if(existing)nav.insertBefore(link,existing);else nav.appendChild(link);
  }
  function installHomepageV2(){
    if(location.pathname!=='/'||document.querySelector('script[data-home-conversion-v2]'))return;
    const script=document.createElement('script');script.src='/home-conversion-v2.js';script.defer=true;script.dataset.homeConversionV2='1';document.head.appendChild(script);
  }
  function installFreeInvoiceOptionsV2(){
    if(location.pathname!=='/invoice-generator/'||document.querySelector('script[data-free-invoice-options-v2]'))return;
    const script=document.createElement('script');script.src='/invoice-generator/document-options-v2.js';script.defer=true;script.dataset.freeInvoiceOptionsV2='1';document.head.appendChild(script);
  }
  function boot(){banner();installProEntry();installHomepageV2();installFreeInvoiceOptionsV2()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
