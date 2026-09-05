import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const publicI18n=fs.readFileSync(path.join(root,'public-i18n.js'),'utf8');
const invoiceI18n=fs.readFileSync(path.join(root,'invoice-i18n.js'),'utf8');
const skip=new Set(['USD','EUR','GBP','NOK','SEK','DKK','CAD','AUD','CHF','JPY','WPA / WPA2','WEP','WPA','PNG','JPG','SVG','PDF','A4','US Letter','Net 7','Net 14','Net 30','Net 60']);
const decode=(s)=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim().replace(/^[^\p{L}\p{N}+]+/u,'').trim();
const escapeRe=(s)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const stripNonVisible=(html)=>html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<template\b[\s\S]*?<\/template>/gi,'').replace(/<noscript\b[\s\S]*?<\/noscript>/gi,'');
const pdfRoutes=['compress-pdf','crop-pdf','delete-pdf-pages','edit-pdf','extract-pdf-pages','html-to-pdf','jpg-to-pdf','merge-pdf','number-pages','pdf-to-excel','pdf-to-html','pdf-to-jpg','pdf-to-png','pdf-to-text','pdf-to-word','png-to-pdf','protect-pdf','reorder-pdf','rotate-pdf','sign-pdf','split-pdf','unlock-pdf','watermark-pdf','word-to-pdf'];
const qrRoutes=['qr-code-generator','url-qr-code-generator','wifi-qr-code-generator','email-qr-code-generator','sms-qr-code-generator','qr-code-for-business-card','qr-code-for-menu','qr-code-with-logo'];

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{if(['.git','node_modules','no','sv','de','es','fr','pro','lead'].includes(entry.name))return[];const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]})}
function sourcesFor(rawHtml){
  const html=stripNonVisible(rawHtml);
  const result=new Set();
  for(const re of [/<button\b[^>]*>([\s\S]*?)<\/button>/gi,/<label\b[^>]*>([\s\S]*?)<\/label>/gi,/<option\b[^>]*>([\s\S]*?)<\/option>/gi,/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi]){
    for(const m of html.matchAll(re)){const text=decode(m[1]);if(text&&text.length<=100&&!skip.has(text)&&/[A-Za-z]/.test(text))result.add(text)}
  }
  for(const m of html.matchAll(/\b(?:placeholder|aria-label|title)=["']([^"']+)["']/gi)){
    const text=decode(m[1]);
    if(!text||text.length>100||skip.has(text)||!/[A-Za-z]/.test(text)||/^https?:/i.test(text)||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))continue;
    result.add(text);
  }
  return result;
}
function countKey(source,code){const pattern=new RegExp(`(?:^|[,\\n]\\s*)['\"]${escapeRe(source)}['\"]\\s*:`, 'g');return (code.match(pattern)||[]).length}
function audit(files,code){
  const missing=new Map();
  for(const file of files){
    if(!fs.existsSync(file))continue;
    const html=fs.readFileSync(file,'utf8');
    const relative=path.relative(root,file);
    for(const source of sourcesFor(html)){
      if(countKey(source,code)>=5)continue;
      const list=missing.get(source)||[];list.push(relative);missing.set(source,list);
    }
  }
  return [...missing.entries()].sort(([a],[b])=>a.localeCompare(b));
}
function failMessage(name,missing){return `Missing ${name} translations (${missing.length} unique):\n${missing.map(([text,paths])=>`${text} :: ${paths.slice(0,4).join(', ')}${paths.length>4?` (+${paths.length-4})`:''}`).join('\n')}`}

// Completed core language surfaces must never regress.
test('invoice generator controls have five non-English translations in invoice-i18n',()=>{
  const file=path.join(root,'invoice-generator','index.html');
  const missing=audit([file],invoiceI18n);
  assert.deepEqual(missing,[],failMessage('invoice',missing));
});

test('PDF tool controls have five non-English translations',()=>{
  const files=pdfRoutes.map((route)=>path.join(root,route,'index.html'));
  const missing=audit(files,publicI18n);
  assert.deepEqual(missing,[],failMessage('PDF',missing));
});

test('QR tool controls have five non-English translations',()=>{
  const files=qrRoutes.map((route)=>path.join(root,route,'index.html'));
  const missing=audit(files,publicI18n);
  assert.deepEqual(missing,[],failMessage('QR',missing));
});

// Keep a full-site inventory visible in CI. It remains blocking until the multilingual catalog is complete.
test('all remaining public runtime controls have five non-English translations',()=>{
  const files=walk(root).filter((f)=>f.endsWith(`${path.sep}index.html`)).filter((f)=>{
    const rel=path.relative(root,f).replaceAll('\\','/');
    if(rel==='invoice-generator/index.html')return false;
    const html=fs.readFileSync(f,'utf8');
    return /language-switcher\.js/.test(html);
  });
  const missing=audit(files,publicI18n);
  assert.deepEqual(missing,[],failMessage('public control',missing));
});


test('localized invoice entry points open the functional translated generator',()=>{
  const routes={
    no:'no/fakturagenerator/index.html',
    sv:'sv/fakturagenerator/index.html',
    de:'de/rechnungsgenerator/index.html',
    es:'es/generador-facturas/index.html',
    fr:'fr/generateur-factures/index.html'
  };
  for(const [code,relative] of Object.entries(routes)){
    const html=fs.readFileSync(path.join(root,relative),'utf8');
    assert.match(html,new RegExp(`href=["']/invoice-generator/\\?lang=${code}["']`),`${relative} must open the functional invoice generator`);
  }
  const switcher=fs.readFileSync(path.join(root,'language-switcher.js'),'utf8');
  assert.ok(switcher.includes("if(english==='/invoice-generator/')return `/invoice-generator/?lang=${code}`"), 'invoice language switching must stay on the functional generator');
});


test('public translation catalog contains no transport markers',()=>{
  assert.doesNotMatch(publicI18n,/ZX\d{3}ZX/);
});
