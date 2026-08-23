import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCashFlow, calculateLoan, calculateRoi } from '../calculator-core.js';

test('ROI returns profit and simple ROI', () => {
  const result = calculateRoi(1000, 1250, 12);
  assert.equal(result.netProfit, 250);
  assert.equal(result.roi, 25);
  assert.ok(Math.abs(result.annualizedRoi - 25) < 0.001);
});

test('ROI safely handles a zero investment', () => {
  const result = calculateRoi(0, 500, 6);
  assert.equal(result.roi, 0);
  assert.equal(result.annualizedRoi, 0);
});

test('loan payment matches a standard amortization result', () => {
  const result = calculateLoan(10000, 6, 5);
  assert.ok(Math.abs(result.scheduledPayment - 193.33) < 0.02);
  assert.equal(result.payoffMonths, 60);
  assert.ok(result.totalInterest > 1500 && result.totalInterest < 1700);
});

test('extra loan payments shorten the payoff period', () => {
  const regular = calculateLoan(20000, 7, 5, 0);
  const faster = calculateLoan(20000, 7, 5, 100);
  assert.ok(faster.payoffMonths < regular.payoffMonths);
  assert.ok(faster.totalInterest < regular.totalInterest);
});

test('cash-flow projection and runway are consistent', () => {
  const result = calculateCashFlow(12000, 8000, 10000, 6);
  assert.equal(result.monthlyNet, -2000);
  assert.equal(result.closingBalance, 0);
  assert.equal(result.runwayMonths, 6);
  assert.equal(result.projection.at(-1).balance, 0);
});
