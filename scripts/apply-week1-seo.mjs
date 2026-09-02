import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root,file),'utf8');
const write = (file,value) => fs.writeFileSync(path.join(root,file),value);

const tools = [
  ['percentage-increase-calculator','Percentage Increase Calculator','Add a known percentage to a starting value.','percentage growth add value'],
  ['percentage-change-calculator','Percentage Change Calculator','Measure the increase or decrease between two values.','percentage change increase decrease'],
  ['discount-calculator','Discount Calculator','Find a sale price and exact savings.','discount sale price savings'],
  ['roas-calculator','ROAS Calculator','Measure attributed revenue for every unit of ad spend.','roas return ad spend marketing'],
  ['customer-acquisition-cost-calculator','Customer Acquisition Cost Calculator','Calculate CAC from acquisition spend and new customers.','cac customer acquisition cost'],
  ['customer-lifetime-value-calculator','Customer Lifetime Value Calculator','Estimate revenue and gross profit CLV.','clv ltv customer lifetime value'],
  ['cpm-calculator','CPM Calculator','Calculate cost per thousand impressions.','cpm cost impressions advertising'],
  ['cpc-calculator','CPC Calculator','Calculate average advertising cost per click.','cpc cost click advertising'],
  ['conversion-rate-calculator','Conversion Rate Calculator','Measure conversions as a percentage of total opportunities.','conversion rate visitors leads'],
  ['price-increase-calculator','Price Increase Calculator','Find a new price and revenue difference.','price increase pricing revenue']
];

let hub = read('business-calculators/index.html');
hub = hub.replace(/numberOfItems":(?:8|18)/,'numberOfItems":21');
hub = hub.replace(/(?:8|18) focused calculators/,'21 focused calculators');
const item8 = '{"@type":"ListItem","position":8,"name":"Gross Profit Calculator","url":"https://solobizkit.it.com/gross-profit-calculator/"}';
const previouslyOmitted = [
  ['target-profit-margin-calculator','Target Profit Margin Calculator'],
  ['freelance-day-rate-calculator','Freelance Day Rate Calculator'],
  ['consultant-hourly-rate-calculator','Consultant Hourly Rate Calculator']
];
const extraItems = [...previouslyOmitted,...tools].map(([slug,title],index)=>`{"@type":"ListItem","position":${index+9},"name":"${title}","url":"https://solobizkit.it.com/${slug}/"}`).join(',');
hub = hub.replace(`${item8}]}`,`${item8},${extraItems}]}`);
hub = hub.replace('numberOfItems":18','numberOfItems":21');
hub = hub.replace('position":9,"name":"Percentage Increase Calculator"','position":12,"name":"Percentage Increase Calculator"')
  .replace('position":10,"name":"Percentage Change Calculator"','position":13,"name":"Percentage Change Calculator"')
  .replace('position":11,"name":"Discount Calculator"','position":14,"name":"Discount Calculator"')
  .replace('position":12,"name":"ROAS Calculator"','position":15,"name":"ROAS Calculator"')
  .replace('position":13,"name":"Customer Acquisition Cost Calculator"','position":16,"name":"Customer Acquisition Cost Calculator"')
  .replace('position":14,"name":"Customer Lifetime Value Calculator"','position":17,"name":"Customer Lifetime Value Calculator"')
  .replace('position":15,"name":"CPM Calculator"','position":18,"name":"CPM Calculator"')
  .replace('position":16,"name":"CPC Calculator"','position":19,"name":"CPC Calculator"')
  .replace('position":17,"name":"Conversion Rate Calculator"','position":20,"name":"Conversion Rate Calculator"')
  .replace('position":18,"name":"Price Increase Calculator"','position":21,"name":"Price Increase Calculator"');
if (!hub.includes('position":9,"name":"Target Profit Margin Calculator"')) {
  hub = hub.replace(`${item8},`,`${item8},{"@type":"ListItem","position":9,"name":"Target Profit Margin Calculator","url":"https://solobizkit.it.com/target-profit-margin-calculator/"},{"@type":"ListItem","position":10,"name":"Freelance Day Rate Calculator","url":"https://solobizkit.it.com/freelance-day-rate-calculator/"},{"@type":"ListItem","position":11,"name":"Consultant Hourly Rate Calculator","url":"https://solobizkit.it.com/consultant-hourly-rate-calculator/"},`);
}
hub = hub.replaceAll('Free Business Calculators for Small Businesses | SoloBizKit','Free Business & Marketing Calculators | SoloBizKit');
hub = hub.replaceAll('Use free business calculators for profit margin, break-even, ROI, loans, cash flow and freelance rates. Clear formulas, instant results and no signup.','Use 21 free business calculators for profit, pricing, ROAS, CAC, CLV, cash flow and freelance rates. Clear formulas, instant results and no signup.');
hub = hub.replace('<a href="#profitability">Profitability</a><a href="#finance">Finance</a>','<a href="#profitability">Profitability</a><a href="#marketing">Marketing</a><a href="#growth">Pricing & growth</a><a href="#finance">Finance</a>');
const marketingCards = tools.slice(3,9).map(([slug,title,copy])=>`      <a class="bc-tool" href="/${slug}/"><small>Marketing</small><strong>${title}</strong><span>${copy}</span><b>Calculate →</b></a>`).join('\n');
const growthCards = [...tools.slice(0,3),tools[9]].map(([slug,title,copy])=>`      <a class="bc-tool" href="/${slug}/"><small>Pricing & growth</small><strong>${title}</strong><span>${copy}</span><b>Calculate →</b></a>`).join('\n');
const financeMarker = '    <section class="bc-section white" id="finance">';
if (!hub.includes('id="marketing"')) {
  hub = hub.replace(financeMarker,`    <section class="bc-section white" id="marketing"><div class="bc-wrap"><div class="bc-heading"><h2>Measure marketing performance</h2><p>Connect advertising cost with reach, clicks, conversions, customers and long-term value.</p></div><div class="bc-grid">\n${marketingCards}\n    </div></div></section>\n    <section class="bc-section" id="growth"><div class="bc-wrap"><div class="bc-heading"><h2>Calculate percentage and pricing changes</h2><p>Turn planned increases and discounts into exact values, or measure the change between two periods.</p></div><div class="bc-grid">\n${growthCards}\n    </div></div></section>\n${financeMarker}`);
}
hub = hub.replace('Methodology reviewed August 23, 2026','Methodology reviewed September 2, 2026');
write('business-calculators/index.html',hub);

let directory = read('tools/index.html');
directory = directory.replace('"dateModified":"2026-08-23"','"dateModified":"2026-09-02"');
const directoryMarker = '<a class="tool-card searchable" data-category="money" data-keywords="roi return investment net profit annualized" href="/roi-calculator/">';
if (!directory.includes('href="/roas-calculator/"')) {
  const cards = tools.map(([slug,title,copy,keywords])=>`<a class="tool-card searchable" data-category="money" data-keywords="${keywords}" href="/${slug}/">\n<small>Business calculators</small>\n<strong>${title}</strong>\n<span>${copy}</span>\n<b>Calculate →</b>\n</a>`).join('\n');
  directory = directory.replace(directoryMarker,`${cards}\n${directoryMarker}`);
}
write('tools/index.html',directory);

let sitemapScript = read('scripts/generate-sitemap.mjs');
sitemapScript = sitemapScript.replace("const lastModified = '2026-08-23';","const lastModified = '2026-09-02';");
write('scripts/generate-sitemap.mjs',sitemapScript);

console.log('Updated calculator hub, tools directory and sitemap metadata for week 1.');
