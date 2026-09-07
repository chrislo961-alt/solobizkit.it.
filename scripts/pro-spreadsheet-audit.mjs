import { readFile } from 'node:fs/promises';
import process from 'node:process';
const [transfer,ui,bootstrap,leads,catalog,settings]=await Promise.all([
 readFile(new URL('../pro/spreadsheet-transfer.js',import.meta.url),'utf8'),
 readFile(new URL('../pro/spreadsheet-ui.js',import.meta.url),'utf8'),
 readFile(new URL('../pro/bootstrap.js',import.meta.url),'utf8'),
 readFile(new URL('../pro/leads/index.html',import.meta.url),'utf8'),
 readFile(new URL('../pro/catalog/index.html',import.meta.url),'utf8'),
 readFile(new URL('../pro/settings/index.html',import.meta.url),'utf8')
]);
const errors=[];const need=(src,text,label)=>{if(!src.includes(text))errors.push(`${label}: missing ${text}`)};
need(transfer,'xlsx-0.20.3/package/xlsx.mjs','engine');
for(const sheet of ['Customers','Leads','Invoices','Invoice lines','Estimates','Estimate lines','Recurring','Recurring lines','Catalog','Export info'])need(transfer,`'${sheet}'`,'export');
for(const token of ['previewSpreadsheetImport','commitSpreadsheetImport','downloadSpreadsheetTemplate','insertInChunks','crm_archived: false'])need(transfer,token,'import');
for(const lang of ['en','no','sv','de','es','fr'])if(!ui.includes(`${lang}:[`))errors.push(`ui missing language ${lang}`);
need(bootstrap,'spreadsheet-ui.js','bootstrap');
for(const [name,html] of [['leads',leads],['catalog',catalog],['settings',settings]]){
 if(!/spreadsheet-ui\.js\?v=20260907-(?:4|[5-9]|\d{2,})/.test(html))errors.push(`${name}: spreadsheet-ui bundle version is stale or missing`);
}
need(leads,'accept=".xlsx,.xls,.csv','leads picker');need(leads,'>Import Excel<','leads action');need(leads,'>Export Excel<','leads action');
if(errors.length){console.error('\nPro spreadsheet audit failed:');errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log('Pro spreadsheet audit passed: Excel import/export, duplicate safety, six-language UI and all entrypoints are wired.');
