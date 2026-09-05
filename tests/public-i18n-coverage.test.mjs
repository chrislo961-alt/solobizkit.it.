import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const i18n=fs.readFileSync(path.join(root,'public-i18n.js'),'utf8');
const skip=new Set(['USD','EUR','GBP','NOK','SEK','DKK','CAD','AUD','CHF','JPY','WPA / WPA2','WEP','PNG','JPG','SVG','PDF','A4','US Letter','Net 7','Net 14','Net 30','Net 60']);
const decode=(s)=>s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim().replace(/^[^\p{L}\p{N}+]+/u,'').trim();
const escapeRe=(s)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{if(['.git','node_modules','no','sv','de','es','fr','pro','lead'].includes(entry.name))return[];const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]})}
function sourcesFor(html){
  const result=new Set();
  for(const re of [/<button\b[^>]*>([\s\S]*?)<\/button>/gi,/<label\b[^>]*>([\s\S]*?)<\/label>/gi,/<option\b[^>]*>([\s\S]*?)<\/option>/gi,/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi]){
    for(const m of html.matchAll(re)){const text=decode(m[1]);if(text&&text.length<=80&&!skip.has(text)&&/[A-Za-z]/.test(text))result.add(text)}
  }
  for(const m of html.matchAll(/\b(?:placeholder|aria-label|title)=["']([^"']+)["']/gi)){const text=decode(m[1]);if(text&&text.length<=80&&!skip.has(text)&&/[A-Za-z]/.test(text)&&!/^https?:/i.test(text))result.add(text)}
  return result;
}

test('all short public control strings have five non-English dictionary entries',()=>{
  const files=walk(root).filter((f)=>f.endsWith(`${path.sep}index.html`));
  const missing=[];
  for(const file of files){
    const html=fs.readFileSync(file,'utf8');
    if(!/language-switcher\.js/.test(html))continue;
    const relative=path.relative(root,file);
    for(const source of sourcesFor(html)){
      const pattern=new RegExp(`['\"]${escapeRe(source)}['\"]\\s*:`, 'g');
      const count=(i18n.match(pattern)||[]).length;
      if(count<5)missing.push(`${relative}: ${source} (${count}/5)`);
    }
  }
  assert.deepEqual(missing,[],`Missing public translations:\n${missing.slice(0,120).join('\n')}${missing.length>120?`\n... and ${missing.length-120} more`:''}`);
});
