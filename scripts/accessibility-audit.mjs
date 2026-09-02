import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const issues = [];

function walk(directory) {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>{
    if (['.git','node_modules','dist'].includes(entry.name)) return [];
    const full = path.join(directory,entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(root).filter((item)=>item.endsWith('index.html'))) {
  const route = path.relative(root,file);
  const html = fs.readFileSync(file,'utf8');
  const structural = html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<template\b[\s\S]*?<\/template>/gi,'');
  const ids = [...structural.matchAll(/\bid=["']([^"']+)["']/gi)].map((match)=>match[1]);
  for (const id of new Set(ids)) if (ids.filter((value)=>value===id).length>1) issues.push(`${route}: duplicate id ${id}`);
  for (const match of structural.matchAll(/<img\b([^>]*)>/gi)) if (!/\balt=["'][^"']*["']/i.test(match[1])) issues.push(`${route}: image missing alt text`);
  for (const match of structural.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const [,tag,attributes] = match;
    if (/\btype=["']hidden["']/i.test(attributes) || /\bhidden\b/i.test(attributes)) continue;
    const id = attributes.match(/\bid=["']([^"']+)["']/i)?.[1];
    const before = structural.slice(0,match.index);
    const wrapped = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
    const named = wrapped || /\baria-label(?:ledby)?=["'][^"']+["']/i.test(attributes) || (id && new RegExp(`<label\\b[^>]*for=["']${id}["']`,'i').test(structural));
    if (!named) issues.push(`${route}: ${tag} ${id || 'without id'} has no associated label`);
  }
}

if (issues.length) {
  console.error(issues.join('\n'));
  process.exit(1);
}

console.log('Verified unique IDs, image alt text and form-control labels on every route.');
