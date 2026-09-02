import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function walk(directory) {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>{
    if (['.git','node_modules','dist'].includes(entry.name)) return [];
    const full = path.join(directory,entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

let changed = 0;
for (const file of walk(root).filter((item)=>item.endsWith('index.html'))) {
  const original = fs.readFileSync(file,'utf8');
  const html = original.replace(/<label(?![^>]*\bfor=)([^>]*)>([\s\S]*?)<\/label>(\s*)<(input|select|textarea)([^>]*\bid=["']([^"']+)["'][^>]*)>/gi,(all,labelAttributes,labelText,space,tag,controlAttributes,id)=>{
    if (/<\/(?:div|section|article|form|fieldset)>/i.test(labelText)) return all;
    return `<label${labelAttributes} for="${id}">${labelText}</label>${space}<${tag}${controlAttributes}>`;
  });
  if (html !== original) {
    fs.writeFileSync(file,html);
    changed++;
  }
}

console.log(`Added explicit form-label associations in ${changed} pages.`);
