import fs from 'node:fs';

const file='site-parity.js';
let code=fs.readFileSync(file,'utf8');

if(!code.includes("['/vat-calculator/',32,'growth']")){
  const tail="['/cleaning-business-profit-calculator/',22,'industry'],['/restaurant-profit-margin-calculator/',23,'industry'],['/ecommerce-profit-margin-calculator/',24,'industry'],['/ecommerce-conversion-rate-calculator/',25,'industry'],['/saas-cac-calculator/',26,'industry'],['/ecommerce-customer-lifetime-value-calculator/',27,'industry'],['/google-ads-cpc-calculator/',28,'industry'],['/social-media-cpm-calculator/',29,'industry'],['/ecommerce-roas-calculator/',30,'industry'],['/price-increase-calculator-for-small-business/',31,'industry']";
  if(!code.includes(tail))throw new Error('Could not find hub item tail');
  code=code.replace(tail,`${tail},['/vat-calculator/',32,'growth']`);
}

const additions={
  en:['Price Increase Calculator for Small Business','VAT Calculator'],
  no:['Prisøkningskalkulator for små bedrifter','MVA-kalkulator'],
  sv:['Prishöjningskalkylator för småföretag','Moms-kalkylator'],
  de:['Preiserhöhungsrechner für kleine Unternehmen','MwSt.-Rechner'],
  es:['Calculadora de aumento de precios para pequeños negocios','Calculadora de IVA'],
  fr:['Calculateur d’augmentation de prix pour petite entreprise','Calculateur de TVA']
};
for(const [lang,[last,vat]] of Object.entries(additions)){
  const needle=`'${last}']`;
  const replacement=`'${last}','${vat}']`;
  if(code.includes(`${lang}:[`) && !code.includes(`'${last}','${vat}']`)){
    const start=code.indexOf(`    ${lang}:[`,code.indexOf('const titleByLang='));
    const end=code.indexOf('\n',start);
    const line=code.slice(start,end);
    if(!line.includes(needle))throw new Error(`Could not find ${lang} title tail`);
    code=code.slice(0,start)+line.replace(needle,replacement)+code.slice(end);
  }
}

fs.writeFileSync(file,code);
console.log('VAT calculator parity checked for all localized calculator hubs.');
