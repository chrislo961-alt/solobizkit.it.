import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pricing = fs.readFileSync(new URL('../pro-pricing/index.html', import.meta.url), 'utf8');
const proIndex = fs.readFileSync(new URL('../pro/index.html', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../pro/bootstrap.js', import.meta.url), 'utf8');
const onboarding = fs.readFileSync(new URL('../pro/onboarding.js', import.meta.url), 'utf8');

test('pricing page has separate trial and existing-user login paths', () => {
  assert.match(pricing, /Start 14-day Pro trial/);
  assert.match(pricing, /Log in to Pro/);
  assert.match(pricing, /href="\/pro\/\?intent=login"/);
});

test('Pro page has one deterministic bootstrap entrypoint', () => {
  const matches = proIndex.match(/<script[^>]+src="\/pro\/bootstrap\.js[^>]*>/g) || [];
  assert.equal(matches.length, 1);
  assert.doesNotMatch(proIndex, /src="\/pro\/pro-app\.js/);
});

test('bootstrap loads core before optional enhancements', () => {
  const appIndex = bootstrap.indexOf('pro-app.js');
  const onboardingIndex = bootstrap.indexOf('onboarding.js');
  assert.ok(appIndex >= 0);
  assert.ok(onboardingIndex > appIndex);
  assert.match(bootstrap, /Promise\.allSettled/);
});

test('first-run activation covers business, payment, customer and invoice setup', () => {
  assert.match(onboarding, /Set up your business/);
  assert.match(onboarding, /Add how customers should pay/);
  assert.match(onboarding, /Add your first customer/);
  assert.match(onboarding, /Create your first invoice/);
  assert.match(onboarding, /pro_onboarding_step_clicked/);
});
