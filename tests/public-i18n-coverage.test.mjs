import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const publicI18n=fs.readFileSync(path.join(root,'public-i18n.js'),'utf8');
const publicExtra=fs.readFileSync(path.join(root,'public-i18n-extra.js'),'utf8');
const invoiceI18n=fs.readFileSync(path.join(root,'invoice-i18n.js'),'utf8');
const skip=new Set(['USD','EUR','GBP','NOK','SEK','DKK','CAD','AUD','CHF','JPY','WPA / WPA2','WEP','WPA','PNG','JPG','SVG','PDF','A4','US Letter','Net 7','Net 14','Net 30','Net 60']);
const decode=(s)=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim().replace(/^[^\p{L}\p{N}+]+/u,'').trim();
const escapeRe=(s)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const stripNonVisible=(html)=>html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<template\b[\s\S]*?<\/template>/gi,'').replace(/<noscript\b[\s\S]*?<\/noscript>/gi,'');
const pdfRoutes=['compress-pdf','crop-pdf','delete-pdf-pages','edit-pdf','extract-pdf-pages','html-to-pdf','jpg-to-pdf','merge-pdf','number-pages','pdf-to-excel','pdf-to-html','pdf-to-jpg','pdf-to-png','pdf-to-text','pdf-to-word','png-to-pdf','protect-pdf','reorder-pdf','rotate-pdf','sign-pdf','split-pdf','unlock-pdf','watermark-pdf','word-to-pdf'];
const qrRoutes=['qr-code-generator','url-qr-code-generator','wifi-qr-code-generator','email-qr-code-generator','sms-qr-code-generator','qr-code-for-business-card','qr-code-for-menu','qr-code-with-logo'];
const languages=['no','sv','de','es','fr'];

function parseBaseCatalog(code){
  const start=code.indexOf('const base=');
  const end=code.indexOf('\n  const extra=',start);
  assert.ok(start>=0&&end>start,'public-i18n.js must expose a base translation matrix');
  const expression=code.slice(start+'const base='.length,end).trim().replace(/;$/,'');
  return vm.runInNewContext(`(${expression})`,Object.create(null));
}
function parseExtraCatalog(code){
  const context={window:{}};
  vm.runInNewContext(code,context,{filename:'public-i18n-extra.js'});
  const extra=context.window.SBK_PUBLIC_I18N_EXTRA;
  assert.deepEqual(Array.from(extra?.languages||[]),languages,'shared translation catalog must cover the five non-English languages in the expected order');
  return extra?.items||{};
}
const publicCatalog={...parseBaseCatalog(publicI18n),...parseExtraCatalog(publicExtra)};
function fullRow(row){return Array.isArray(row)&&row.length===languages.length&&row.every((value)=>typeof value==='string'&&value.trim())}
function hasPublicTranslation(source){return fullRow(publicCatalog[source])}

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
function hasInvoiceTranslation(source){return countKey(source,invoiceI18n)>=5||hasPublicTranslation(source)}
function audit(files,hasTranslation){
  const missing=new Map();
  for(const file of files){
    if(!fs.existsSync(file))continue;
    const html=fs.readFileSync(file,'utf8');
    const relative=path.relative(root,file);
    for(const source of sourcesFor(html)){
      if(hasTranslation(source))continue;
      const list=missing.get(source)||[];list.push(relative);missing.set(source,list);
    }
  }
  return [...missing.entries()].sort(([a],[b])=>a.localeCompare(b));
}
function failMessage(name,missing){return `Missing ${name} translations (${missing.length} unique):\n${missing.map(([text,paths])=>`${text} :: ${paths.slice(0,4).join(', ')}${paths.length>4?` (+${paths.length-4})`:''}`).join('\n')}`}

test('shared public translation matrix has five complete language values per entry',()=>{
  const invalid=Object.entries(publicCatalog).filter(([,row])=>!fullRow(row));
  assert.deepEqual(invalid,[],`Incomplete shared translation rows: ${invalid.map(([source])=>source).join(', ')}`);
});

// Invoice-specific controls live in invoice-i18n; shared shell controls live in the public catalog.
test('invoice generator controls have five non-English translations',()=>{
  const file=path.join(root,'invoice-generator','index.html');
  const missing=audit([file],hasInvoiceTranslation);
  assert.deepEqual(missing,[],failMessage('invoice',missing));
});

test('PDF tool controls have five non-English translations',()=>{
  const files=pdfRoutes.map((route)=>path.join(root,route,'index.html'));
  const missing=audit(files,hasPublicTranslation);
  assert.deepEqual(missing,[],failMessage('PDF',missing));
});

test('QR tool controls have five non-English translations',()=>{
  const files=qrRoutes.map((route)=>path.join(root,route,'index.html'));
  const missing=audit(files,hasPublicTranslation);
  assert.deepEqual(missing,[],failMessage('QR',missing));
});

// Full-site inventory is blocking: any new visible control must enter the shared language matrix.
test('all remaining public runtime controls have five non-English translations',()=>{
  const files=walk(root).filter((f)=>f.endsWith(`${path.sep}index.html`)).filter((f)=>{
    const rel=path.relative(root,f).replaceAll('\\','/');
    if(rel==='invoice-generator/index.html')return false;
    const html=fs.readFileSync(f,'utf8');
    return /language-switcher\.js/.test(html);
  });
  const missing=audit(files,hasPublicTranslation);
  assert.deepEqual(missing,[],failMessage('public control',missing));
});
