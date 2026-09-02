import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const updates = {
  'html-to-pdf/index.html': [['<textarea class="editor" id="html">','<textarea class="editor" id="html" aria-label="HTML source">']],
  'pdf-to-html/index.html': [['<textarea class="html-output" id="source"','<textarea class="html-output" id="source" aria-label="Generated HTML source"']],
  'pdf-to-text/index.html': [['<textarea class="text-output" id="output"','<textarea class="text-output" id="output" aria-label="Extracted PDF text"']],
  'pdf-to-word/index.html': [['<input id="fileInput" type="file"','<input id="fileInput" type="file" aria-label="Choose PDF files"']],
  'qr-code-generator/index.html': [
    ['<label>QR color</label>','<label for="fgText">QR color</label>'],
    ['<input id="fg" type="color" value="#111827">','<input id="fg" type="color" value="#111827" aria-label="QR color picker">'],
    ['<input id="fgText" value="#111827">','<input id="fgText" value="#111827" aria-label="QR color hex value">'],
    ['<label>Background</label>','<label for="bgText">Background</label>'],
    ['<input id="bg" type="color" value="#ffffff">','<input id="bg" type="color" value="#ffffff" aria-label="Background color picker">'],
    ['<input id="bgText" value="#ffffff">','<input id="bgText" value="#ffffff" aria-label="Background color hex value">'],
    ['<label>Error correction</label><select id="level">','<label for="level">Error correction</label><select id="level">']
  ]
};

for (const [file,replacements] of Object.entries(updates)) {
  const target = path.join(root,file);
  let html = fs.readFileSync(target,'utf8');
  for (const [from,to] of replacements) if (!html.includes(to)) html = html.replace(from,to);
  fs.writeFileSync(target,html);
}

console.log('Applied explicit accessibility names to complex controls.');
