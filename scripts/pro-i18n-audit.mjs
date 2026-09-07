import { readFile } from 'node:fs/promises';
import process from 'node:process';

const [core, extra, onboarding] = await Promise.all([
  readFile(new URL('../pro/pro-i18n.js', import.meta.url), 'utf8'),
  readFile(new URL('../pro/pro-workspace-i18n-extra.js', import.meta.url), 'utf8'),
  readFile(new URL('../pro/onboarding.js', import.meta.url), 'utf8'),
]);

const supported = ['en', 'no', 'sv', 'de', 'es', 'fr'];
const errors = [];

for (const lang of supported) {
  if (!core.includes(`${lang}:{`) && !core.includes(`${lang}: {`)) errors.push(`Core i18n is missing language block: ${lang}`);
  if (!onboarding.includes(`${lang}: {`) && !onboarding.includes(`${lang}:{`)) errors.push(`Onboarding is missing language block: ${lang}`);
}

for (const lang of supported.slice(1)) {
  if (!extra.includes(`'${lang}'`) && !extra.includes(`"${lang}"`)) errors.push(`Extra workspace i18n is missing language: ${lang}`);
}

const critical = [
  'Loading business settings…',
  'Company profile',
  'Payment details',
  'EMAIL DELIVERY',
  'Test before you email customers',
  'ACCOUNT & BILLING',
  'SoloBizKit subscription',
  'Manage subscription',
  'PRO TRIAL',
  'Paid this month',
  'Action center',
  'Business activity',
  'CUSTOMER HISTORY',
  'Loading recurring invoices…',
  'Recurring profiles',
  'Search products and services…',
  'No catalog items found.',
  'Loading leads…',
  'Create quotes, track acceptance and convert accepted work into invoices without retyping anything.',
];

for (const key of critical) {
  if (!extra.includes(`'${key.replaceAll("'", "\\'")}'`) && !extra.includes(key)) errors.push(`Missing critical Pro translation key: ${key}`);
}

const matrixEntries = [...extra.matchAll(/^\s{2}'[^\n]+':\[/gm)].length;
if (matrixEntries < 80) errors.push(`Workspace translation matrix unexpectedly small: ${matrixEntries} entries`);

const onboardingKeys = ['businessTitle', 'paymentsTitle', 'customerTitle', 'invoiceTitle', 'workspaceReady'];
for (const key of onboardingKeys) {
  const occurrences = onboarding.split(`${key}:`).length - 1;
  if (occurrences < supported.length) errors.push(`Onboarding key ${key} is not present for all six languages (${occurrences}/6)`);
}

if (errors.length) {
  console.error('\nPro i18n audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Pro i18n audit passed: 6 languages, ${matrixEntries} extended translation entries, critical workspace coverage present.`);
