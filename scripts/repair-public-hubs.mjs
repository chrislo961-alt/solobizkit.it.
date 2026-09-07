import fs from 'node:fs';

function updateFile(file, transform) {
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after !== before) fs.writeFileSync(file, after);
}

updateFile('business-calculators/index.html', (input) => {
  let html = input;
  html = html.replaceAll('Use 31 free business calculators', 'Use 32 free business calculators');
  html = html.replace('"numberOfItems":31', '"numberOfItems":32');
  html = html.replace('31 focused calculators', '32 focused calculators');
  html = html.replace('<a href="#industry">Industry calculators</a><a href="#industry">Industry calculators</a>', '<a href="#industry">Industry calculators</a>');

  const schemaLast = '{"@type":"ListItem","position":31,"name":"Price Increase Calculator for Small Business","url":"https://solobizkit.it.com/price-increase-calculator-for-small-business/"}';
  const schemaVat = '{"@type":"ListItem","position":32,"name":"VAT Calculator","url":"https://solobizkit.it.com/vat-calculator/"}';
  if (!html.includes(schemaVat) && html.includes(schemaLast)) html = html.replace(schemaLast, `${schemaLast},${schemaVat}`);

  const discountCard = '<a class="bc-tool" href="/discount-calculator/"><small>Pricing & growth</small><strong>Discount Calculator</strong><span>Find a sale price and exact savings.</span><b>Calculate →</b></a>';
  const vatCard = '<a class="bc-tool" href="/vat-calculator/"><small>Tax & pricing</small><strong>VAT Calculator</strong><span>Add VAT to a net amount or remove VAT from a VAT-inclusive total.</span><b>Calculate VAT →</b></a>';
  if (!html.includes(vatCard) && html.includes(discountCard)) html = html.replace(discountCard, `${discountCard}\n      ${vatCard}`);
  return html;
});

updateFile('tools/index.html', (input) => {
  let html = input;
  const discountCard = `<a class="tool-card searchable" data-category="money" data-keywords="discount sale price savings" href="/discount-calculator/">
<small>Business calculators</small>
<strong>Discount Calculator</strong>
<span>Find a sale price and exact savings.</span>
<b>Calculate →</b>
</a>`;
  const vatCard = `<a class="tool-card searchable" data-category="money" data-keywords="vat tax sales tax add remove gross net price" href="/vat-calculator/">
<small>Business calculators</small>
<strong>VAT Calculator</strong>
<span>Add VAT to a net amount or remove VAT from a VAT-inclusive total.</span>
<b>Calculate VAT →</b>
</a>`;
  if (!html.includes('href="/vat-calculator/"') && html.includes(discountCard)) html = html.replace(discountCard, `${discountCard}\n${vatCard}`);
  return html;
});

console.log('Public calculator hubs checked and repaired.');
