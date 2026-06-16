// Mortgage Calculator Logic

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateMortgage() {
  const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
  const annualInterestRate = parseFloat(document.getElementById('interestRate').value) || 0;
  const loanTermYears = parseInt(document.getElementById('loanTerm').value) || 30;
  const periodsPerYear = parseInt(document.getElementById('repaymentFrequency').value) || 12;
  const offsetBalance = parseFloat(document.getElementById('offsetBalance').value) || 0;

  // Total number of payment periods
  const n = loanTermYears * periodsPerYear;

  // Rate per period
  const r = (annualInterestRate / 100) / periodsPerYear;

  // 1. Calculate Standard Repayment (Without Offset) - standard amortization formula
  // P = L[c(1 + c)^n]/[(1 + c)^n - 1]
  let standardRepayment = 0;
  let totalInterestStandard = 0;

  if (r > 0) {
    standardRepayment = loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    totalInterestStandard = (standardRepayment * n) - loanAmount;
  } else {
    standardRepayment = loanAmount / n;
    totalInterestStandard = 0;
  }

  // 2. Calculate Actual Scenario (With Offset)
  // Assuming the offset balance stays constant for simplicity
  let balance = loanAmount;
  let totalInterestWithOffset = 0;
  let actualPeriods = 0;

  for (let i = 0; i < n; i++) {
    if (balance <= 0) break;
    
    // Interest is charged on (balance - offsetBalance), floored at 0
    let interestCharged = Math.max(0, (balance - offsetBalance) * r);
    totalInterestWithOffset += interestCharged;
    
    // The repayment goes to interest first, then principal
    let principalPaid = standardRepayment - interestCharged;
    
    // If the standard repayment is more than enough to clear the balance + interest
    if (balance + interestCharged < standardRepayment) {
      principalPaid = balance;
    }
    
    balance -= principalPaid;
    actualPeriods++;
  }

  const offsetSavings = Math.max(0, totalInterestStandard - totalInterestWithOffset);
  const totalCost = loanAmount + totalInterestWithOffset;

  // Map frequency to label
  let freqLabel = "Monthly";
  if (periodsPerYear === 26) freqLabel = "Fortnightly";
  if (periodsPerYear === 52) freqLabel = "Weekly";

  // Update UI
  document.getElementById('resultsSection').classList.add('visible');
  
  document.getElementById('repaymentLabel').innerText = `Estimated ${freqLabel} Repayment`;
  document.getElementById('repaymentDisplay').innerText = formatCurrency(standardRepayment);
  
  document.getElementById('offsetSavingsDisplay').innerText = formatCurrency(offsetSavings);
  
  document.getElementById('totalInterestDisplay').innerText = formatCurrency(totalInterestWithOffset);
  document.getElementById('totalCostDisplay').innerText = formatCurrency(totalCost);
  
  document.getElementById('principalDisplay').innerText = formatCurrency(loanAmount);
  
  // Show actual term if offset reduces it
  if (actualPeriods < n) {
      let yearsSaved = (n - actualPeriods) / periodsPerYear;
      document.getElementById('termDisplay').innerHTML = `${(actualPeriods / periodsPerYear).toFixed(1)} Years <span style="color: var(--green); font-size: 0.8em; margin-left: 8px;">(Saved ${yearsSaved.toFixed(1)} yrs)</span>`;
  } else {
      document.getElementById('termDisplay').innerText = `${loanTermYears} Years`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mortgageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    calculateMortgage();
  });
});
