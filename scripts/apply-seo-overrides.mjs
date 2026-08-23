import fs from 'node:fs';
import path from 'node:path';

const pages = {
  'business-name-generator/index.html': ['Free Business Name Generator – Brand Ideas | SoloBizKit', 'Generate business name ideas by industry, style and keywords. Refine a shortlist with practical naming checks. Free to use with no signup.'],
  'convert-multiple-pdfs-to-word/index.html': ['Convert Multiple PDFs to Word Free | SoloBizKit', 'Convert multiple PDF files to editable Word documents in one browser workflow. Free batch PDF to DOCX conversion with no signup.'],
  'delete-pdf-pages/index.html': ['Delete PDF Pages Free Online | SoloBizKit', 'Remove unwanted pages from a PDF and download a new copy. Free browser-based PDF page remover with visual selection and no signup.'],
  'extract-pdf-pages/index.html': ['Extract PDF Pages Free Online | SoloBizKit', 'Select PDF pages or ranges, extract them and download a new PDF. Free browser-based page extraction with no signup required.'],
  'free-invoice-generator/index.html': ['Free Invoice Generator – No Signup | SoloBizKit', 'Create a professional invoice for free, preview the result and print or save it as PDF. No account, trial or email signup required.'],
  'how-to-make-an-invoice/index.html': ['How to Make an Invoice: Free Guide | SoloBizKit', 'Learn how to make a clear client invoice, which fields to include, how to number it and how to set payment terms. Includes a free generator.'],
  'invoice-generator/index.html': ['Free Invoice Generator – Create & Save PDF | SoloBizKit', 'Create a professional client invoice, calculate totals and print or save it as PDF. Free invoice maker with no account required.'],
  'invoice-generator-for-freelancers/index.html': ['Freelance Invoice Generator Free | SoloBizKit', 'Create a freelancer invoice with client details, line items, tax, payment terms and notes. Preview, print or save as PDF without signup.'],
  'invoice-guide/index.html': ['Small Business Invoice Guide | SoloBizKit', 'A practical guide to invoice fields, numbering, payment terms, record keeping and common mistakes for freelancers and small businesses.'],
  'invoice-number-generator/index.html': ['Free Invoice Number Generator | SoloBizKit', 'Generate a consistent invoice number with a prefix, year and sequence. Free tool for freelancers and small businesses with no signup.'],
  'invoice-template-for-small-business/index.html': ['Free Small Business Invoice Template | SoloBizKit', 'Use a clear small-business invoice structure with company, client, line-item, tax and payment fields, then open the free invoice generator.'],
  'number-pages/index.html': ['Add Page Numbers to PDF Free | SoloBizKit', 'Add page numbers to a PDF, choose position, starting number and page range, then download a new numbered copy. Free and browser-based.'],
  'paycheck-calculator/index.html': ['Free Paycheck Calculator – Take-Home Pay | SoloBizKit', 'Estimate gross pay, deductions and take-home pay by pay period. Free planning calculator with clear assumptions and no signup required.'],
  'pdf-to-excel/index.html': ['PDF to Excel Converter Free | SoloBizKit', 'Extract rows and simple tables from a PDF into an editable Excel file. Free browser-based PDF to XLSX conversion with no signup.'],
  'pdf-to-word/index.html': ['PDF to Word Converter Free – No Signup | SoloBizKit', 'Convert selectable PDF text into an editable Word document. Free browser-based PDF to DOCX converter with no account or file upload to SoloBizKit.'],
  'pdf-tools/index.html': ['24 Free PDF Tools – Convert, Edit & Sign | SoloBizKit', 'Use 24 free PDF tools to convert, compress, merge, split, sign, protect and organize files in your browser with no SoloBizKit account.'],
  'profit-margin-calculator/index.html': ['Profit Margin Calculator – Margin & Markup | SoloBizKit', 'Calculate gross profit, profit margin, markup and target selling price. Compare pricing scenarios instantly with this free business calculator.'],
  'qr-code-for-business-card/index.html': ['Business Card QR Code Generator | SoloBizKit', 'Create a QR code for a business card that links to your website or contact page. Free, customizable and downloadable with no signup.'],
  'split-pdf/index.html': ['Split PDF Free – Extract Pages Online | SoloBizKit', 'Split a PDF by page ranges and download each selected section as a new file. Free browser-based PDF splitter with no signup.'],
  'url-qr-code-generator/index.html': ['Free URL QR Code Generator | SoloBizKit', 'Turn a website URL into a downloadable QR code. Customize size and colors, test the result and export it free with no signup.'],
  'unlock-pdf/index.html': ['Unlock PDF Free – Remove a Known Password | SoloBizKit', 'Remove supported PDF password protection when you know the password. Free browser-based tool for authorized files, with no signup.'],
  'pdf-to-html/index.html': ['PDF to HTML Converter Free | SoloBizKit', 'Extract selectable PDF text into clean standalone HTML in your browser. Free PDF to HTML conversion with no signup or SoloBizKit upload.'],
  'png-to-pdf/index.html': ['PNG to PDF Converter Free | SoloBizKit', 'Combine PNG images into one PDF, choose page size and image fit, then download the result. Free browser-based tool with no signup.']
};

function attr(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

for (const [relative, [title, description]] of Object.entries(pages)) {
  const file = path.join(process.cwd(), relative);
  let html = fs.readFileSync(file, 'utf8');
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta([^>]+)name=["']description["']([^>]+)content=["'][^"']*["']([^>]*)>/i, `<meta$1name="description"$2content="${attr(description)}"$3>`)
    .replace(/<meta([^>]+)property=["']og:title["']([^>]+)content=["'][^"']*["']([^>]*)>/i, `<meta$1property="og:title"$2content="${attr(title)}"$3>`)
    .replace(/<meta([^>]+)property=["']og:description["']([^>]+)content=["'][^"']*["']([^>]*)>/i, `<meta$1property="og:description"$2content="${attr(description)}"$3>`)
    .replace(/<meta([^>]+)name=["']twitter:title["']([^>]+)content=["'][^"']*["']([^>]*)>/i, `<meta$1name="twitter:title"$2content="${attr(title)}"$3>`)
    .replace(/<meta([^>]+)name=["']twitter:description["']([^>]+)content=["'][^"']*["']([^>]*)>/i, `<meta$1name="twitter:description"$2content="${attr(description)}"$3>`);
  fs.writeFileSync(file, html);
}

console.log(`Applied ${Object.keys(pages).length} focused SEO title and description overrides.`);
