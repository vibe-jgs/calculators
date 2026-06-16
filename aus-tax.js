// Australian Tax Calculator Logic 2025-26

function toggleSwitch(btn) {
  const isChecked = btn.getAttribute('aria-checked') === 'true';
  btn.setAttribute('aria-checked', !isChecked);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// 2025-26 Resident Income Tax Rates (Stage 3 Tax Cuts maintained)
function calculateBaseTax(income) {
  if (income <= 18200) return 0;
  if (income <= 45000) return (income - 18200) * 0.16;
  if (income <= 135000) return 4288 + (income - 45000) * 0.30;
  if (income <= 190000) return 31288 + (income - 135000) * 0.37;
  return 51638 + (income - 190000) * 0.45;
}

// 2025-26 HECS/HELP Marginal Repayment System
function calculateHECS(income) {
  let hecs = 0;
  if (income <= 67000) {
    hecs = 0;
  } else if (income <= 125000) {
    hecs = (income - 67000) * 0.15;
  } else if (income <= 179285) {
    hecs = 8700 + (income - 125000) * 0.17;
  } else {
    hecs = income * 0.10; // 10% of TOTAL repayment income as per ATO rules for the final bracket
  }
  return hecs;
}

function calculateTax() {
  // Get inputs
  const rawIncome = parseFloat(document.getElementById('income').value) || 0;
  const paygWithheld = parseFloat(document.getElementById('payg').value) || 0;
  
  const hasMedicare = document.getElementById('toggleMedicare').getAttribute('aria-checked') === 'true';
  const hasHecs = document.getElementById('toggleHecs').getAttribute('aria-checked') === 'true';
  const includesSuper = document.getElementById('toggleSuper').getAttribute('aria-checked') === 'true';
  
  // Superannuation calculations (12% for 2025-26)
  let taxableIncome = rawIncome;
  let superAmount = 0;
  
  if (includesSuper) {
    // If gross includes super, extract the base salary
    // Package = Salary + Salary * 0.12 = Salary * 1.12
    taxableIncome = rawIncome / 1.12;
    superAmount = rawIncome - taxableIncome;
  } else {
    // If gross excludes super, super is paid on top
    superAmount = taxableIncome * 0.12;
  }
  
  // Calculate Base Tax
  const baseTax = calculateBaseTax(taxableIncome);
  
  // Calculate Medicare
  const medicare = hasMedicare ? taxableIncome * 0.02 : 0;
  
  // Calculate HECS
  const hecs = hasHecs ? calculateHECS(taxableIncome) : 0;
  
  // Totals
  const totalTax = baseTax + medicare + hecs;
  const netIncome = taxableIncome - totalTax;
  const effectiveRate = taxableIncome > 0 ? (totalTax / taxableIncome) * 100 : 0;

  // Update UI
  document.getElementById('resultsSection').classList.add('visible');
  
  document.getElementById('netIncomeDisplay').innerText = formatCurrency(netIncome);
  document.getElementById('effectiveRateDisplay').innerText = effectiveRate.toFixed(1) + '%';
  document.getElementById('totalTaxDisplay').innerText = formatCurrency(totalTax);
  document.getElementById('superDisplay').innerText = formatCurrency(superAmount);
  
  document.getElementById('taxableIncomeDisplay').innerText = formatCurrency(taxableIncome);
  document.getElementById('baseTaxDisplay').innerText = formatCurrency(baseTax);
  
  const medicareRow = document.getElementById('medicareRow');
  if (hasMedicare) {
    medicareRow.style.display = 'flex';
    document.getElementById('medicareDisplay').innerText = formatCurrency(medicare);
  } else {
    medicareRow.style.display = 'none';
  }
  
  const hecsRow = document.getElementById('hecsRow');
  if (hasHecs) {
    hecsRow.style.display = 'flex';
    document.getElementById('hecsDisplay').innerText = formatCurrency(hecs);
  } else {
    hecsRow.style.display = 'none';
  }
  
  // PAYG Section
  const paygSection = document.getElementById('paygSection');
  const refundRow = document.getElementById('refundRow');
  const owingRow = document.getElementById('owingRow');
  
  if (paygWithheld > 0) {
    paygSection.style.display = 'block';
    document.getElementById('paygDisplay').innerText = formatCurrency(paygWithheld);
    
    if (paygWithheld > totalTax) {
      // Refund
      refundRow.style.display = 'flex';
      owingRow.style.display = 'none';
      document.getElementById('refundDisplay').innerText = formatCurrency(paygWithheld - totalTax);
    } else {
      // Owe
      refundRow.style.display = 'none';
      owingRow.style.display = 'flex';
      document.getElementById('owingDisplay').innerText = formatCurrency(totalTax - paygWithheld);
    }
  } else {
    paygSection.style.display = 'none';
    refundRow.style.display = 'none';
    owingRow.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('taxForm').addEventListener('submit', (e) => {
    e.preventDefault();
    calculateTax();
  });

  document.querySelectorAll('.toggle').forEach(btn => {
    btn.addEventListener('click', function() {
      toggleSwitch(this);
    });
  });
});
