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
    const html=fs.readFileSync(file,'utf8');
    const relative=path.relative(root,file);
    for(const source of sourcesFor(html)){
      if(countKey(source,code)>=5)continue;
      const list=missing.get(source)||[];list.push(relative);missing.set(source,list);
    }
  }
  return [...missing.entries()].sort(([a],[b])=>a.localeCompare(b));
}

test('all public runtime controls have five non-English translations',()=>{
  const files=walk(root).filter((f)=>f.endsWith(`${path.sep}index.html`)).filter((f)=>{
    const rel=path.relative(root,f).replaceAll('\\','/');
    if(rel==='invoice-generator/index.html')return false;
    const html=fs.readFileSync(f,'utf8');
    return /language-switcher\.js/.test(html);
  });
  const missing=audit(files,publicI18n);
  assert.deepEqual(missing,[],`Missing public control translations (${missing.length} unique):\n${missing.slice(0,180).map(([text,paths])=>`${text} :: ${paths.slice(0,3).join(', ')}${paths.length>3?` (+${paths.length-3})`:''}`).join('\n')}${missing.length>180?`\n... and ${missing.length-180} more`:''}`);
});

test('invoice generator controls have five non-English translations in invoice-i18n',()=>{
  const file=path.join(root,'invoice-generator','index.html');
  const missing=audit([file],invoiceI18n);
  assert.deepEqual(missing,[],`Missing invoice translations (${missing.length} unique):\n${missing.map(([text])=>text).join('\n')}`);
});
