export function calculateRoi(investment, returnValue, months = 12) {
  const cost = Math.max(0, Number(investment) || 0);
  const proceeds = Math.max(0, Number(returnValue) || 0);
  const period = Math.max(1, Number(months) || 12);
  const netProfit = proceeds - cost;
  const roi = cost > 0 ? (netProfit / cost) * 100 : 0;
  const annualizedRoi = cost > 0 && proceeds > 0
    ? (Math.pow(proceeds / cost, 12 / period) - 1) * 100
    : 0;
  return { cost, proceeds, period, netProfit, roi, annualizedRoi };
}

export function calculateLoan(principal, annualRate, years, extraPayment = 0) {
  const amount = Math.max(0, Number(principal) || 0);
  const rate = Math.max(0, Number(annualRate) || 0) / 100 / 12;
  const months = Math.max(1, Math.round((Number(years) || 1) * 12));
  const extra = Math.max(0, Number(extraPayment) || 0);
  const scheduled = rate === 0
    ? amount / months
    : amount * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1);

  let balance = amount;
  let totalPaid = 0;
  let payoffMonths = 0;
  while (balance > 0.005 && payoffMonths < 1200) {
    const interest = balance * rate;
    const payment = Math.min(balance + interest, scheduled + extra);
    balance = Math.max(0, balance + interest - payment);
    totalPaid += payment;
    payoffMonths += 1;
  }

  return {
    amount,
    scheduledPayment: scheduled,
    actualPayment: scheduled + extra,
    totalPaid,
    totalInterest: Math.max(0, totalPaid - amount),
    payoffMonths,
    monthsSaved: Math.max(0, months - payoffMonths)
  };
}

export function calculateCashFlow(openingBalance, monthlyRevenue, monthlyExpenses, months = 12) {
  const opening = Number(openingBalance) || 0;
  const revenue = Math.max(0, Number(monthlyRevenue) || 0);
  const expenses = Math.max(0, Number(monthlyExpenses) || 0);
  const period = Math.min(60, Math.max(1, Math.round(Number(months) || 12)));
  const monthlyNet = revenue - expenses;
  const closingBalance = opening + monthlyNet * period;
  const runwayMonths = monthlyNet < 0 && opening > 0 ? opening / Math.abs(monthlyNet) : null;
  const projection = Array.from({ length: period }, (_, index) => ({
    month: index + 1,
    balance: opening + monthlyNet * (index + 1)
  }));
  return { opening, revenue, expenses, period, monthlyNet, closingBalance, runwayMonths, projection };
}
