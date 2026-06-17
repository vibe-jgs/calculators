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

  let yearlyData = [];
  let currentYearInterest = 0;
  let currentYearPrincipal = 0;

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

    currentYearInterest += interestCharged;
    currentYearPrincipal += principalPaid;

    // Save yearly data at the end of each year or when loan is paid off
    if ((i + 1) % periodsPerYear === 0 || balance <= 0) {
      yearlyData.push({
        interest: currentYearInterest,
        principal: currentYearPrincipal
      });
      currentYearInterest = 0;
      currentYearPrincipal = 0;
    }
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

  // Render Graph
  const graphContainer = document.getElementById('graphContainer');
  const yAxis = document.getElementById('yAxis');
  const xAxis = document.getElementById('xAxis');

  graphContainer.innerHTML = ''; // clear previous
  yAxis.innerHTML = '';
  xAxis.innerHTML = '';
  
  if (yearlyData.length > 0) {
    let maxYearlyPayment = 0;
    yearlyData.forEach(data => {
      if (data.interest + data.principal > maxYearlyPayment) {
        maxYearlyPayment = data.interest + data.principal;
      }
    });

    // Render Y-Axis
    const ySteps = 4;
    for (let i = ySteps; i >= 0; i--) {
      const val = maxYearlyPayment * (i / ySteps);
      let labelVal = val >= 1000 ? `$${(val/1000).toFixed(0)}k` : `$${val.toFixed(0)}`;
      const label = document.createElement('div');
      label.innerText = labelVal;
      yAxis.appendChild(label);
    }

    yearlyData.forEach((data, index) => {
      const barCol = document.createElement('div');
      barCol.style.flex = '1';
      barCol.style.display = 'flex';
      barCol.style.flexDirection = 'column';
      barCol.style.justifyContent = 'flex-end';
      barCol.style.height = '100%';
      barCol.style.minWidth = '2px'; // Prevent squishing too much
      barCol.title = `Year ${index + 1}: Interest ${formatCurrency(data.interest)}, Principal ${formatCurrency(data.principal)}`;

      const interestHeight = (data.interest / maxYearlyPayment) * 100;
      const principalHeight = (data.principal / maxYearlyPayment) * 100;

      if (interestHeight > 0) {
        const interestBar = document.createElement('div');
        interestBar.style.height = `${interestHeight}%`;
        interestBar.style.backgroundColor = 'var(--rose)';
        interestBar.style.width = '100%';
        barCol.appendChild(interestBar);
      }

      if (principalHeight > 0) {
        const principalBar = document.createElement('div');
        principalBar.style.height = `${principalHeight}%`;
        principalBar.style.backgroundColor = 'var(--accent)';
        principalBar.style.width = '100%';
        barCol.appendChild(principalBar);
      }

      // Add a tiny gap or border between years for visual separation on hover
      barCol.addEventListener('mouseenter', () => barCol.style.opacity = '0.8');
      barCol.addEventListener('mouseleave', () => barCol.style.opacity = '1');

      graphContainer.appendChild(barCol);

      // Render X-Axis labels
      const year = index + 1;
      if (year === 1 || year % 5 === 0 || year === yearlyData.length) {
        const xLabel = document.createElement('div');
        xLabel.innerText = year;
        xLabel.style.position = 'absolute';
        xLabel.style.left = `calc(${((index + 0.5) / yearlyData.length) * 100}% - 10px)`;
        xLabel.style.width = '20px';
        xLabel.style.textAlign = 'center';
        xAxis.appendChild(xLabel);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mortgageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    calculateMortgage();
  });
});
