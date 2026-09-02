import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const site = 'https://solobizkit.it.com';

const pages = [
  {
    slug: 'percentage-increase-calculator', title: 'Percentage Increase Calculator', category: 'Growth calculator',
    description: 'Add a percentage increase to any number and see the new value and exact amount added. Free percentage increase calculator with formula and example.',
    intro: 'Add a percentage increase to a price, rate, budget or other number and see the result instantly.',
    fields: [['start','Starting value',100],['rate','Percentage increase',12.5]],
    resultLabel: 'VALUE AFTER INCREASE', outputs: [['added','Amount added'],['rateOut','Increase applied'],['multiplier','Growth multiplier']],
    formula: 'New value = starting value × (1 + percentage increase ÷ 100). The amount added equals the new value minus the starting value.',
    example: 'If a service costs $100 and you increase the price by 12.5%, the amount added is $12.50 and the new price is $112.50.',
    guidance: 'Use this when you already know the percentage you want to add. It works for prices, hourly rates, budgets, revenue targets and any other positive number. For comparing an old value with a new value when the percentage is unknown, use the Percentage Change Calculator instead.',
    calc: 'const s=n("start"),r=n("rate"),a=s*r/100,v=s+a;set("main",num(v));set("added",num(a));set("rateOut",pct(r));set("multiplier",(1+r/100).toFixed(3)+"×");',
    faqs: [['How do I add 20% to a number?','Multiply the original number by 1.20. For example, 50 increased by 20% is 60.'],['Is percentage increase the same as percentage change?','Percentage increase applies a known rate to a starting value. Percentage change measures the rate between an old value and a new value.'],['Can I use this for a price increase?','Yes. Enter the current price and the planned increase percentage to calculate the new price.']]
  },
  {
    slug: 'percentage-change-calculator', title: 'Percentage Change Calculator', category: 'Growth calculator',
    description: 'Calculate percentage change between an old and new value. See the increase or decrease, absolute difference and formula instantly.',
    intro: 'Compare an old value with a new value to measure the percentage increase or decrease.',
    fields: [['old','Old value',800],['new','New value',920]],
    resultLabel: 'PERCENTAGE CHANGE', outputs: [['difference','Absolute change'],['direction','Direction'],['ratio','New ÷ old']],
    formula: 'Percentage change = (new value − old value) ÷ |old value| × 100. Using the absolute old value keeps the direction tied to the change itself.',
    example: 'If monthly revenue moves from $800 to $920, the absolute increase is $120 and the percentage change is 15%.',
    guidance: 'This calculator is useful for revenue, expenses, traffic, prices and performance metrics. A positive result means the new value is higher; a negative result means it is lower. When the old value is zero, a conventional percentage change cannot be calculated because division by zero is undefined.',
    calc: 'const o=n("old"),v=n("new",false),d=v-o,p=o!==0?d/Math.abs(o)*100:null;set("main",p===null?"Not defined":signedPct(p));set("difference",signedNum(d));set("direction",d>0?"Increase":d<0?"Decrease":"No change");set("ratio",o!==0?(v/o).toFixed(3)+"×":"—");',
    faqs: [['What is the percentage change formula?','Subtract the old value from the new value, divide by the absolute old value, then multiply by 100.'],['Can percentage change be negative?','Yes. A negative percentage change means the new value is lower than the old value.'],['Why is percentage change undefined from zero?','The formula divides by the old value. Division by zero is undefined, so there is no conventional percentage-change result.']]
  },
  {
    slug: 'discount-calculator', title: 'Discount Calculator', category: 'Pricing calculator',
    description: 'Calculate a sale price after a percentage discount. See the exact savings, final price and price paid percentage with no signup.',
    intro: 'Enter an original price and discount to find the sale price and exact savings.',
    fields: [['price','Original price',120],['discount','Discount percentage',25]],
    resultLabel: 'PRICE AFTER DISCOUNT', outputs: [['saving','You save'],['paid','Price paid'],['discountOut','Discount applied']],
    formula: 'Discount amount = original price × discount percentage ÷ 100. Sale price = original price − discount amount.',
    example: 'A $120 item with a 25% discount saves $30 and has a final price of $90. You pay 75% of the original price.',
    guidance: 'Use the same currency throughout; the percentage calculation works identically for dollars, euros, pounds or kroner. The result does not include sales tax, shipping or additional fixed coupons. Apply those separately when they affect the checkout total.',
    calc: 'const p=n("price"),d=Math.min(n("discount"),100),s=p*d/100,f=p-s;set("main",money(f));set("saving",money(s));set("paid",pct(100-d));set("discountOut",pct(d));',
    faqs: [['How do I calculate 30% off?','Multiply the original price by 0.30 to find the savings, then subtract that amount from the original price.'],['Does the calculator include sales tax?','No. It calculates the percentage discount before any taxes, shipping or fixed-value coupons.'],['Can I calculate a 100% discount?','Yes. A 100% discount makes the price after discount zero.']]
  },
  {
    slug: 'roas-calculator', title: 'ROAS Calculator', category: 'Marketing calculator',
    description: 'Calculate return on ad spend from ad revenue and campaign cost. See ROAS ratio, percentage and revenue after ad spend instantly.',
    intro: 'Measure how much revenue an advertising campaign generated for every unit of ad spend.',
    fields: [['revenue','Revenue attributed to ads',7500],['spend','Advertising spend',1500]],
    resultLabel: 'RETURN ON AD SPEND', outputs: [['percent','ROAS percentage'],['afterSpend','Revenue minus ad spend'],['revenuePer','Revenue per $1 spent']],
    formula: 'ROAS = revenue attributed to ads ÷ advertising spend. ROAS percentage equals that ratio multiplied by 100.',
    example: 'A campaign that attributes $7,500 in revenue to $1,500 in ad spend has a 5.00× ROAS, or 500% return on ad spend.',
    guidance: 'ROAS measures revenue efficiency, not total profitability. Product cost, agency fees, fulfillment, discounts and refunds can make a campaign unprofitable even when ROAS looks strong. Compare the result with your contribution margin and attribution method before scaling spend.',
    calc: 'const r=n("revenue"),s=n("spend"),x=s?r/s:null;set("main",x===null?"—":x.toFixed(2)+"×");set("percent",x===null?"—":pct(x*100));set("afterSpend",money(r-s));set("revenuePer",x===null?"—":money(x));',
    faqs: [['What does a 4× ROAS mean?','It means the campaign generated four units of attributed revenue for every one unit spent on advertising.'],['Is ROAS the same as ROI?','No. ROAS compares ad revenue with ad spend, while ROI normally compares profit with the full investment cost.'],['What is a good ROAS?','It depends on gross margin, operating costs, attribution and growth goals. A profitable threshold is specific to the business.']]
  },
  {
    slug: 'customer-acquisition-cost-calculator', title: 'Customer Acquisition Cost Calculator', category: 'Marketing calculator',
    description: 'Calculate customer acquisition cost (CAC) from sales and marketing spend and new customers. Free calculator with formula and example.',
    intro: 'Divide acquisition spending by new customers to calculate your customer acquisition cost.',
    fields: [['spend','Sales and marketing spend',12000],['customers','New customers acquired',300]],
    resultLabel: 'CUSTOMER ACQUISITION COST', outputs: [['spendOut','Total acquisition spend'],['customersOut','New customers'],['per100','Cost to acquire 100 customers']],
    formula: 'Customer acquisition cost = total sales and marketing acquisition spend ÷ number of new customers acquired in the same period.',
    example: 'If you spend $12,000 on sales and marketing and acquire 300 new customers, CAC is $40 per new customer.',
    guidance: 'Match the time period and scope of both inputs. Include relevant advertising, sales labor, commissions, creative and software costs when you want a fully loaded CAC. Compare CAC with customer lifetime value and gross profit, not revenue alone.',
    calc: 'const s=n("spend"),c=n("customers"),cac=c?s/c:null;set("main",cac===null?"—":money(cac));set("spendOut",money(s));set("customersOut",whole(c));set("per100",cac===null?"—":money(cac*100));',
    faqs: [['What costs should be included in CAC?','Include the sales and marketing costs used to acquire the customers in your measurement scope, such as ads, commissions, labor and tools.'],['Should existing customers be counted?','CAC normally uses new customers acquired during the period, not every active customer.'],['How often should CAC be calculated?','Calculate it on a consistent monthly or quarterly basis and also by channel when attribution is reliable.']]
  },
  {
    slug: 'customer-lifetime-value-calculator', title: 'Customer Lifetime Value Calculator', category: 'Marketing calculator',
    description: 'Estimate customer lifetime value (CLV) from average order value, purchase frequency, lifespan and gross margin. Free and instant.',
    intro: 'Estimate revenue and gross profit value across an average customer relationship.',
    fields: [['order','Average order value',80],['frequency','Purchases per year',6],['lifespan','Customer lifespan in years',3],['margin','Gross margin percentage',55]],
    resultLabel: 'GROSS PROFIT CLV', outputs: [['revenueClv','Revenue CLV'],['annual','Annual customer revenue'],['ratioHint','Suggested comparison']],
    formula: 'Revenue CLV = average order value × purchases per year × customer lifespan. Gross profit CLV = revenue CLV × gross margin percentage.',
    example: 'An $80 average order, six purchases per year and a three-year lifespan creates $1,440 in revenue CLV. At a 55% gross margin, gross profit CLV is $792.',
    guidance: 'This simple model is useful for planning but does not discount future cash flow or model churn by cohort. Use averages from a consistent customer group. Comparing gross profit CLV with CAC is generally more informative than comparing revenue CLV with CAC.',
    calc: 'const o=n("order"),f=n("frequency"),l=n("lifespan"),m=Math.min(n("margin"),100),annual=o*f,rev=annual*l,gp=rev*m/100;set("main",money(gp));set("revenueClv",money(rev));set("annual",money(annual));set("ratioHint","Compare with CAC");',
    faqs: [['What is the simple CLV formula?','Multiply average order value by purchase frequency and average customer lifespan. Apply gross margin to estimate gross profit CLV.'],['Should CLV use revenue or profit?','Both can be useful, but gross profit CLV is usually a better comparison with acquisition cost because it accounts for cost of goods sold.'],['Does this model include churn or discounting?','No. It is a simple average-based planning model and does not discount future cash flow or model cohort churn.']]
  },
  {
    slug: 'cpm-calculator', title: 'CPM Calculator', category: 'Marketing calculator',
    description: 'Calculate CPM, or cost per thousand impressions, from ad spend and impressions. See cost per impression and projected cost instantly.',
    intro: 'Calculate advertising cost per thousand impressions from campaign spend and reach.',
    fields: [['spend','Advertising spend',850],['impressions','Impressions',250000]],
    resultLabel: 'COST PER 1,000 IMPRESSIONS', outputs: [['perImpression','Cost per impression'],['impressionsPer','Impressions per $1'],['projected','Cost for 1 million impressions']],
    formula: 'CPM = advertising spend ÷ impressions × 1,000. CPM stands for cost per mille, where mille means one thousand.',
    example: 'An $850 campaign with 250,000 impressions has a CPM of $3.40 and a cost per impression of $0.0034.',
    guidance: 'CPM compares the cost of visibility across campaigns and channels. It does not show whether people clicked, converted or became profitable customers. Confirm that platforms use comparable impression definitions before making direct comparisons.',
    calc: 'const s=n("spend"),i=n("impressions"),c=i?s/i*1000:null;set("main",c===null?"—":money(c));set("perImpression",i?money(s/i,4):"—");set("impressionsPer",s?whole(i/s):"—");set("projected",c===null?"—":money(c*1000));',
    faqs: [['What does CPM stand for?','CPM means cost per mille, or the cost of one thousand advertising impressions.'],['How is CPM calculated?','Divide advertising spend by total impressions, then multiply by 1,000.'],['Is a lower CPM always better?','No. A lower CPM buys cheaper visibility, but audience quality, clicks, conversions and profit also matter.']]
  },
  {
    slug: 'cpc-calculator', title: 'CPC Calculator', category: 'Marketing calculator',
    description: 'Calculate cost per click from ad spend and clicks. See CPC, clicks per dollar and projected cost for 1,000 clicks instantly.',
    intro: 'Calculate the average cost of each advertising click from total spend and clicks.',
    fields: [['spend','Advertising spend',1200],['clicks','Clicks',800]],
    resultLabel: 'COST PER CLICK', outputs: [['clicksPer','Clicks per $1'],['per100','Cost for 100 clicks'],['per1000','Cost for 1,000 clicks']],
    formula: 'Cost per click = total advertising spend ÷ number of clicks received.',
    example: 'A campaign that spends $1,200 and receives 800 clicks has an average CPC of $1.50.',
    guidance: 'CPC is useful for comparing traffic costs, but a cheap click is not automatically a valuable click. Review conversion rate, customer acquisition cost and contribution margin alongside CPC. Use spend and clicks from the same platform, campaign and reporting period.',
    calc: 'const s=n("spend"),c=n("clicks"),v=c?s/c:null;set("main",v===null?"—":money(v));set("clicksPer",s?(c/s).toFixed(2):"—");set("per100",v===null?"—":money(v*100));set("per1000",v===null?"—":money(v*1000));',
    faqs: [['How do you calculate CPC?','Divide total advertising spend by the number of clicks from the same campaign and period.'],['Is CPC the same as CPA?','No. CPC measures cost per click, while CPA measures cost per acquisition or another defined action.'],['Why can platform CPC differ from this result?','Platforms may exclude some charges or clicks, apply attribution rules, or show rounded values. Use matching report totals.']]
  },
  {
    slug: 'conversion-rate-calculator', title: 'Conversion Rate Calculator', category: 'Marketing calculator',
    description: 'Calculate conversion rate from conversions and visitors, sessions, clicks or leads. See non-conversions and conversions per 1,000.',
    intro: 'Measure what percentage of visitors, clicks or leads completed your chosen conversion.',
    fields: [['conversions','Conversions',125],['total','Total visitors, clicks or leads',5000]],
    resultLabel: 'CONVERSION RATE', outputs: [['nonConversions','Did not convert'],['per1000','Conversions per 1,000'],['oneIn','Approximately one conversion per']],
    formula: 'Conversion rate = conversions ÷ total opportunities × 100. Both values must use the same audience and time period.',
    example: 'If 125 of 5,000 website visitors convert, the conversion rate is 2.5%, or 25 conversions per 1,000 visitors.',
    guidance: 'Define one conversion action before comparing results. A purchase, booked call and email signup represent different intent levels. Use the same denominator across periods—such as users, sessions or clicks—because switching denominators changes the rate.',
    calc: 'const c=n("conversions"),t=n("total"),r=t?c/t*100:null;set("main",r===null?"—":pct(r));set("nonConversions",whole(Math.max(0,t-c)));set("per1000",t?(c/t*1000).toFixed(1):"—");set("oneIn",c?"1 in "+(t/c).toFixed(1):"—");',
    faqs: [['What is the conversion rate formula?','Divide conversions by total visitors, clicks, sessions or leads, then multiply by 100.'],['Can conversions be higher than visitors?','They can if one person can complete the action multiple times. For a person-level conversion rate, use unique converters and unique users.'],['Should I use users or sessions?','Use the denominator that matches your decision and keep it consistent when comparing pages, campaigns or periods.']]
  },
  {
    slug: 'price-increase-calculator', title: 'Price Increase Calculator', category: 'Pricing calculator',
    description: 'Calculate a new price after a percentage increase. See the amount added and estimated revenue impact per 100 sales instantly.',
    intro: 'Turn a planned percentage price increase into a new selling price and revenue difference.',
    fields: [['price','Current price',49],['increase','Planned price increase',8]],
    resultLabel: 'NEW PRICE', outputs: [['added','Increase per sale'],['revenue100','Added revenue per 100 sales'],['oldShare','Old price as share of new price']],
    formula: 'New price = current price × (1 + increase percentage ÷ 100). Added revenue assumes the same sales volume and excludes tax, discounts and demand changes.',
    example: 'Increasing a $49 price by 8% adds $3.92 and produces a new price of $52.92. At 100 unchanged sales, gross revenue would rise by $392.',
    guidance: 'A price increase changes more than revenue. Consider customer response, positioning, taxes, discounting and variable cost before deciding. Test several scenarios and use the profit margin calculator to see how the new price affects margin.',
    calc: 'const p=n("price"),r=n("increase"),a=p*r/100,v=p+a;set("main",money(v));set("added",money(a));set("revenue100",money(a*100));set("oldShare",v?pct(p/v*100):"—");',
    faqs: [['How do I calculate an 8% price increase?','Multiply the current price by 1.08. The difference between the new and old price is the increase per sale.'],['Does added revenue equal added profit?','No. Revenue and profit are different. Taxes, fees, variable costs and changes in sales volume can affect profit.'],['Can I use this for hourly rates?','Yes. Enter the current hourly rate as the price to calculate the planned new rate.']]
  }
];

const esc = (value) => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function schema(page) {
  return JSON.stringify({
    '@context':'https://schema.org', '@graph':[
      {'@type':'WebApplication',name:page.title,url:`${site}/${page.slug}/`,description:page.description,applicationCategory:'BusinessApplication',operatingSystem:'Any',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}},
      {'@type':'BreadcrumbList',itemListElement:[
        {'@type':'ListItem',position:1,name:'Home',item:`${site}/`},
        {'@type':'ListItem',position:2,name:'Business Calculators',item:`${site}/business-calculators/`},
        {'@type':'ListItem',position:3,name:page.title,item:`${site}/${page.slug}/`}
      ]},
      {'@type':'FAQPage',mainEntity:page.faqs.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))}
    ]
  });
}

function render(page) {
  const fields = page.fields.map(([id,label,value])=>`<div class="field"><label for="${id}">${esc(label)}</label><input id="${id}" type="number" inputmode="decimal" value="${value}" step="any"></div>`).join('\n');
  const outputs = page.outputs.map(([id,label])=>`<div class="line"><span>${esc(label)}</span><b id="${id}">—</b></div>`).join('\n');
  const faqHtml = page.faqs.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n');
  const relatedPool = page.category === 'Marketing calculator'
    ? ['roas-calculator','customer-acquisition-cost-calculator','customer-lifetime-value-calculator','cpm-calculator','cpc-calculator','conversion-rate-calculator']
    : ['percentage-increase-calculator','percentage-change-calculator','discount-calculator','price-increase-calculator','profit-margin-calculator','markup-calculator'];
  const labels = Object.fromEntries(pages.map((item)=>[item.slug,item.title]));
  labels['profit-margin-calculator']='Profit Margin Calculator'; labels['markup-calculator']='Markup Calculator';
  const relatedHtml = relatedPool.filter((slug)=>slug!==page.slug).slice(0,5).map((slug)=>`<a href="/${slug}/">${esc(labels[slug])} →</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)} | SoloBizKit</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${site}/${page.slug}/">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta property="og:title" content="${esc(page.title)} | SoloBizKit">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${site}/${page.slug}/">
<meta property="og:site_name" content="SoloBizKit">
<meta property="og:image" content="${site}/assets/images/solobizkit-social-preview.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)} | SoloBizKit">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${site}/assets/images/solobizkit-social-preview.png">
<meta name="theme-color" content="#2563eb">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/finance-seo.css">
<link rel="stylesheet" href="/growth-calculators.css">
<link rel="stylesheet" href="/analytics-consent.css">
<link rel="stylesheet" href="/global-shell.css">
<link rel="stylesheet" href="/visual-polish.css">
<link rel="stylesheet" href="/theme-warm-green.css">
<script src="/analytics.js" defer></script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9212084765206199" crossorigin="anonymous"></script>
<script type="application/ld+json">${schema(page)}</script>
</head>
<body>
<header class="sbk-global-header"><div class="sbk-global-nav"><a class="sbk-global-brand" href="/" aria-label="SoloBizKit home"><img class="sbk-brand-icon" src="/favicon.svg" width="29" height="29" alt="">SoloBiz<span>Kit</span></a><nav class="sbk-global-links" aria-label="Primary navigation"><a href="/business-calculators/" aria-current="page">Calculators</a><a href="/invoice-generator/">Invoices</a><a href="/pdf-tools/">PDF Tools</a><a href="/qr-code-generator/">QR Codes</a><a href="/about/">About</a></nav><a class="sbk-global-tools" href="/tools/">All Tools</a></div></header>
<main>
<nav class="breadcrumbs wrap" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/business-calculators/">Business calculators</a><span>›</span><span aria-current="page">${esc(page.title)}</span></nav>
<section class="hero"><div class="wrap"><span class="pill">FREE ${esc(page.category).toUpperCase()}</span><h1>${esc(page.title)}</h1><p>${esc(page.intro)}</p></div></section>
<section class="wrap app" aria-label="${esc(page.title)}">
<div class="card"><h2>Enter your numbers</h2>${fields}<p class="hint">Results update instantly. Your entries stay in your browser and are not stored.</p><button class="reset" id="reset" type="button">Reset example</button></div>
<div class="card" aria-live="polite"><div class="result"><small>${esc(page.resultLabel)}</small><div class="big" id="main">—</div></div>${outputs}<p class="hint">Planning estimate only. Confirm assumptions before making financial or advertising decisions.</p></div>
</section>
<section class="content"><article class="wrap">
<h2>How to use the ${esc(page.title)}</h2>
<p>${esc(page.guidance)}</p>
<h3>The formula</h3><p>${esc(page.formula)}</p>
<div class="example"><strong>Example</strong><p>${esc(page.example)}</p></div>
<h3>Questions people ask</h3><div class="faq">${faqHtml}</div>
<h3>Related business calculators</h3><div class="related">
${relatedHtml}<a href="/business-calculators/">All Business Calculators →</a>
</div></article></section>
</main>
<footer class="sbk-global-footer"><div class="sbk-global-footer-inner"><div class="sbk-global-bottom"><span>© 2026 SoloBizKit</span><span><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/contact/">Contact</a></span></div></div></footer>
<script>
const defaults=${JSON.stringify(Object.fromEntries(page.fields.map(([id,,value])=>[id,value])))};
const $=id=>document.getElementById(id),n=(id,nonNegative=true)=>{const v=parseFloat($(id).value);return Number.isFinite(v)?(nonNegative?Math.max(0,v):v):0},set=(id,value)=>$(id).textContent=value;
const numberFormat=new Intl.NumberFormat("en-US",{maximumFractionDigits:2}),moneyFormat=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2});
const num=v=>numberFormat.format(Number.isFinite(v)?v:0),whole=v=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Number.isFinite(v)?v:0),money=(v,digits=2)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:digits>2?digits:2,maximumFractionDigits:digits}).format(Number.isFinite(v)?v:0),pct=v=>(Number.isFinite(v)?v:0).toFixed(2)+"%",signedPct=v=>(v>0?"+":"")+v.toFixed(2)+"%",signedNum=v=>(v>0?"+":"")+num(v);
function calculate(){${page.calc}}
document.querySelectorAll("input").forEach(input=>input.addEventListener("input",calculate));
$("reset").addEventListener("click",()=>{Object.entries(defaults).forEach(([id,value])=>$(id).value=value);calculate();$(Object.keys(defaults)[0]).focus()});calculate();
</script>
</body>
</html>`;
}

for (const page of pages) {
  const directory = path.join(root,page.slug);
  fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'index.html'),render(page));
}

console.log(`Generated ${pages.length} growth calculator pages.`);
