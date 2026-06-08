/* ═══════════════════════════════════════════════
   SUPER WEALTH WIZARD V2 LOGIC
   ═══════════════════════════════════════════════ */

// ── Tax Configuration (Copied from original) ──
const CONFIG = {
  financialYear: '2025-26',
  superRate: 0.12,
  medicareLevyRate: 0.02,
  div293Threshold: 250_000,
  div293Rate: 0.15,
  taxBrackets: [
    { min: 0,       max: 18_200,    rate: 0,    base: 0,      label: '$0 – $18,200' },
    { min: 18_201,  max: 45_000,    rate: 0.16, base: 0,      label: '$18,201 – $45,000' },
    { min: 45_001,  max: 135_000,   rate: 0.30, base: 4_288,  label: '$45,001 – $135,000' },
    { min: 135_001, max: 190_000,   rate: 0.37, base: 31_288, label: '$135,001 – $190,000' },
    { min: 190_001, max: Infinity,  rate: 0.45, base: 51_638, label: '$190,001+' },
  ],
  mlsSingles: [
    { min: 0,       max: 101_000, rate: 0 },
    { min: 101_001, max: 118_000, rate: 0.01 },
    { min: 118_001, max: 158_000, rate: 0.0125 },
    { min: 158_001, max: Infinity, rate: 0.015 },
  ],
};


function createTooltip(title, text) {
  if (!text) return title;
  return `
    <div style="display: flex; align-items: center; gap: 6px; position: relative;">
      <span>${title}</span>
      <div class="info-tooltip">
        <span class="info-tooltip__icon">?</span>
        <div class="info-tooltip__text">${text}</div>
      </div>
    </div>
  `;
}

// ── Input Formatting ───────────────────────────
function formatCurrency(value) {
  if (value === 0) return '$0';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatPercent(decimal, decimals = 1) {
  return (decimal * 100).toFixed(decimals) + '%';
}

function parseInputValue(inputEl) {
  if (!inputEl) return 0;
  const raw = inputEl.value.replace(/[^0-9.]/g, '');
  return parseFloat(raw) || 0;
}

function handleCurrencyInput(e) {
  const input = e.target;
  const cursorPos = input.selectionStart;
  const rawBefore = input.value;
  const raw = input.value.replace(/[^0-9]/g, '');

  if (raw === '') {
    input.value = '0';
    return;
  }
  const formatted = parseInt(raw, 10).toLocaleString('en-AU');
  input.value = formatted;
  const diff = formatted.length - rawBefore.length;
  const newPos = Math.max(0, cursorPos + diff);
  requestAnimationFrame(() => input.setSelectionRange(newPos, newPos));
}

document.querySelectorAll('.wizard-input').forEach(input => {
  input.addEventListener('input', handleCurrencyInput);
});

// ── Wizard Logic ───────────────────────────────
let currentStep = 1;
const totalSteps = 9;
let wizardAnswers = {
  hasCgt: null,
  hasPhi: null
};

const overlay = document.getElementById('wizardOverlay');
const resultsSection = document.getElementById('results');
const progressBar = document.getElementById('progressBar');
const btnPrev = document.getElementById('wizPrev');
const btnNext = document.getElementById('wizNext');
const restartBtn = document.getElementById('restartBtn');

function updateWizard() {
  // Update Progress Bar
  const progress = (currentStep / totalSteps) * 100;
  progressBar.style.width = `${progress}%`;

  // Show/Hide Steps
  document.querySelectorAll('.wizard-step').forEach(el => {
    el.classList.remove('active');
    if (parseInt(el.dataset.step) === currentStep) {
      el.classList.add('active');
      const input = el.querySelector('input');
      if (input) setTimeout(() => input.focus(), 50);
    }
  });

  // Nav buttons visibility
  btnPrev.style.visibility = currentStep > 1 ? 'visible' : 'hidden';
  btnNext.innerHTML = currentStep === totalSteps ? 'Calculate Results &rarr;' : 'Next &rarr;';
}

// Yes/No Button Logic
document.querySelectorAll('.wizard-btn-choice').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const parentRow = e.target.closest('.wizard-buttons-row');
    parentRow.querySelectorAll('.wizard-btn-choice').forEach(b => b.classList.remove('selected'));
    e.target.classList.add('selected');
    
    if (currentStep === 4) {
      wizardAnswers.hasCgt = e.target.dataset.val === 'yes';
      if (wizardAnswers.hasCgt) {
        nextStep();
      } else {
        // Skip Step 5 (CGT Amount) if No
        currentStep = 6;
        updateWizard();
      }
    } else if (currentStep === 9) {
      wizardAnswers.hasPhi = e.target.dataset.val === 'yes';
      nextStep();
    }
  });
});

function nextStep() {
  if (currentStep < totalSteps) {
    if (currentStep === 4 && wizardAnswers.hasCgt === false) {
      currentStep = 6; // skip 5
    } else {
      currentStep++;
    }
    updateWizard();
  } else {
    finishWizard();
  }
}

function prevStep() {
  if (currentStep > 1) {
    if (currentStep === 6 && wizardAnswers.hasCgt === false) {
      currentStep = 4; // go back to 4
    } else {
      currentStep--;
    }
    updateWizard();
  }
}

btnNext.addEventListener('click', nextStep);
btnPrev.addEventListener('click', prevStep);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !overlay.classList.contains('hidden')) {
    nextStep();
  }
});

restartBtn.addEventListener('click', () => {
  resultsSection.style.display = 'none';
  overlay.classList.remove('hidden');
  currentStep = 1;
  updateWizard();
});

// ── Tax Math Engine ────────────────────────────
function calculateIncomeTax(taxableIncome) {
  let totalTax = 0;
  for (const bracket of CONFIG.taxBrackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      totalTax += taxableInBracket * bracket.rate;
    }
  }
  return { total: totalTax };
}

function calculateLITO(taxableIncome) {
  if (taxableIncome <= 37_500) return 700;
  if (taxableIncome <= 45_000) return Math.max(0, 700 - (taxableIncome - 37_500) * 0.05);
  if (taxableIncome <= 66_667) return Math.max(0, 325 - (taxableIncome - 45_000) * 0.015);
  return 0;
}

function calculateMedicareLevy(taxableIncome) {
  return taxableIncome * CONFIG.medicareLevyRate;
}

function calculateMLS(taxableIncome, hasPrivateHealth, rfba = 0) {
  if (hasPrivateHealth) return { rate: 0, amount: 0 };
  const incomeForMLS = taxableIncome + rfba;
  for (const tier of CONFIG.mlsSingles) {
    if (incomeForMLS >= tier.min && incomeForMLS <= tier.max) {
      return { rate: tier.rate, amount: Math.round(incomeForMLS * tier.rate) };
    }
  }
  return { rate: 0.015, amount: Math.round((incomeForMLS) * 0.015) };
}

function calculateDiv293(taxableIncome, superAmount, rfba = 0) {
  const div293Income = taxableIncome + superAmount + rfba;
  const excess = Math.max(0, div293Income - CONFIG.div293Threshold);
  if (excess <= 0) {
    return {
      income: div293Income,
      threshold: CONFIG.div293Threshold,
      excess: 0,
      taxableAmount: 0,
      tax: 0,
      applies: false,
    };
  }
  const taxableAmount = Math.min(superAmount, excess);
  const tax = Math.round(taxableAmount * CONFIG.div293Rate);
  return {
    income: div293Income,
    threshold: CONFIG.div293Threshold,
    excess,
    taxableAmount,
    tax,
    applies: true,
  };
}

function calculateScenario(taxableIncome, superGuaranteeAmount, concessionalExtra, nonConcessionalExtra, hasPrivateHealth, rfba = 0) {
  const taxResult = calculateIncomeTax(taxableIncome);
  const lito = calculateLITO(taxableIncome);
  const incomeTaxAfterOffsets = Math.max(0, taxResult.total - lito);
  const medicareLevy = calculateMedicareLevy(taxableIncome);
  const mls = calculateMLS(taxableIncome, hasPrivateHealth, rfba);

  const totalExtra = concessionalExtra + nonConcessionalExtra;
  const superTaxOnExtra = Math.round(concessionalExtra * 0.15); 
  const div293 = calculateDiv293(taxableIncome, superGuaranteeAmount + concessionalExtra, rfba);
  const totalTaxLiability = incomeTaxAfterOffsets + medicareLevy + mls.amount;

  return {
    taxableIncome,
    incomeTaxAfterOffsets,
    medicareLevy,
    mls,
    totalTaxLiability,
    extraContrib: totalExtra,
    concessionalExtra,
    nonConcessionalExtra,
    superTaxOnExtra,
    div293
  };
}

// ── Final Calculation & Render ─────────────────
const inputSection = document.getElementById('inputSection');

function finishWizard() {
  overlay.classList.add('hidden');
  resultsSection.style.display = 'block';
  inputSection.style.display = 'block'; // Reveal the side panel!
  
  const basePayVal = parseInputValue(document.getElementById('wizBasePay'));
  const rfbaVal = parseInputValue(document.getElementById('wizRfba'));
  const rsuVal = parseInputValue(document.getElementById('wizRsu'));
  const cgtTotalVal = wizardAnswers.hasCgt ? parseInputValue(document.getElementById('wizCgtTotal')) : 0;
  const cgtEligibleVal = wizardAnswers.hasCgt ? parseInputValue(document.getElementById('wizCgtEligible')) : 0;
  const carryForwardVal = parseInputValue(document.getElementById('wizCarryForward'));
  const extraContribVal = parseInputValue(document.getElementById('wizExtraSuper'));
  const extraContribVal2 = parseInputValue(document.getElementById('wizExtraSuper2'));
  const hasPrivateHealth = wizardAnswers.hasPhi === true;

  // Sync values to side panel
  document.getElementById('basePay').value = basePayVal ? basePayVal.toLocaleString('en-AU') : '';
  document.getElementById('rfbaValue').value = rfbaVal ? rfbaVal.toLocaleString('en-AU') : '';
  document.getElementById('rsuValue').value = rsuVal ? rsuVal.toLocaleString('en-AU') : '';
  document.getElementById('capitalGains').value = cgtTotalVal ? cgtTotalVal.toLocaleString('en-AU') : '';
  document.getElementById('cgtEligible').value = cgtEligibleVal ? cgtEligibleVal.toLocaleString('en-AU') : '';
  document.getElementById('carryForward').value = carryForwardVal ? carryForwardVal.toLocaleString('en-AU') : '';
  document.getElementById('extraSuper').value = extraContribVal ? extraContribVal.toLocaleString('en-AU') : '';
  document.getElementById('extraSuper2').value = extraContribVal2 ? extraContribVal2.toLocaleString('en-AU') : '';
  document.getElementById('privateHealth').setAttribute('aria-checked', hasPrivateHealth);

  performLiveCalculation();
}

function performLiveCalculation() {
  const basePay = parseInputValue(document.getElementById('basePay'));
  const rfba = parseInputValue(document.getElementById('rfbaValue'));
  const rsuValue = parseInputValue(document.getElementById('rsuValue'));
  const cgtTotal = parseInputValue(document.getElementById('capitalGains'));
  const cgtEligible = parseInputValue(document.getElementById('cgtEligible'));
  const carryForward = parseInputValue(document.getElementById('carryForward'));
  const extraContribRaw = parseInputValue(document.getElementById('extraSuper'));
  const extraContribRaw2 = parseInputValue(document.getElementById('extraSuper2'));
  const hasPrivateHealth = document.getElementById('privateHealth').getAttribute('aria-checked') === 'true';

  // Prevent eligible CGT from exceeding total CGT
  const validCgtEligible = Math.min(cgtEligible, cgtTotal);

  // CGT Math
  const cgtDiscount = validCgtEligible * 0.5;
  const netCapitalGain = cgtTotal - cgtDiscount;

  // SG
  const sg = Math.round(basePay * CONFIG.superRate);
  
  // Base PAYG
  const paygWithheld = Math.max(0, calculateIncomeTax(basePay).total - calculateLITO(basePay)) + calculateMedicareLevy(basePay);

  // Baseline
  const taxableIncomeBase = basePay + rsuValue + netCapitalGain;
  const concCap = 30_000 + carryForward;
  
  const baseData = calculateScenario(taxableIncomeBase, sg, 0, 0, hasPrivateHealth, rfba);

  // Opt 1
  const remainingCap = Math.max(0, concCap - sg);
  const concessionalExtra = Math.min(extraContribRaw, remainingCap);
  const nonConcessionalExtra = Math.max(0, extraContribRaw - remainingCap);
  const taxableIncomeOpt = taxableIncomeBase - concessionalExtra;
  const optData = calculateScenario(taxableIncomeOpt, sg, concessionalExtra, nonConcessionalExtra, hasPrivateHealth, rfba);

  // Opt 2
  const concessionalExtra2 = Math.min(extraContribRaw2, remainingCap);
  const nonConcessionalExtra2 = Math.max(0, extraContribRaw2 - remainingCap);
  const taxableIncomeOpt2 = taxableIncomeBase - concessionalExtra2;
  const optData2 = calculateScenario(taxableIncomeOpt2, sg, concessionalExtra2, nonConcessionalExtra2, hasPrivateHealth, rfba);

  renderComparisonDashboard(baseData, optData, optData2, paygWithheld, sg, concCap, basePay);
}

// Live update listeners for the side panel
document.querySelectorAll('.panel-input').forEach(input => {
  input.addEventListener('input', (e) => {
    handleCurrencyInput(e);
    performLiveCalculation();
  });
});

document.querySelectorAll('.panel-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const current = toggle.getAttribute('aria-checked') === 'true';
    toggle.setAttribute('aria-checked', !current);
    performLiveCalculation();
  });
});

function renderComparisonDashboard(base, opt, opt2, paygWithheld, sg, concCap, basePay) {
  const el = document.getElementById('dashboardSummary');
  
  const baseRemainingTax = base.totalTaxLiability - paygWithheld;
  const optRemainingTax = opt.totalTaxLiability - paygWithheld;
  const opt2RemainingTax = opt2.totalTaxLiability - paygWithheld;

  const baseCashRequired = baseRemainingTax;
  const optCashRequired = optRemainingTax + opt.extraContrib;
  const opt2CashRequired = opt2RemainingTax + opt2.extraContrib;

  const baseNetSuper = sg - Math.round(sg * 0.15) - base.div293.tax;
  const optTotalSuper = sg + opt.extraContrib;
  const optNetSuper = optTotalSuper - Math.round(optTotalSuper * 0.15) - opt.div293.tax;
  const netOnlyExtraSuper = optNetSuper - baseNetSuper;

  const opt2TotalSuper = sg + opt2.extraContrib;
  const opt2NetSuper = opt2TotalSuper - Math.round(opt2TotalSuper * 0.15) - opt2.div293.tax;
  const netOnlyExtraSuper2 = opt2NetSuper - baseNetSuper;

  const showCol3 = opt2.extraContrib > 0;

  let html = '';

  html += `<div class="strategy-header" style="justify-content: center; margin-bottom: var(--space-xl);">
    <div class="strategy-header__info" style="font-size: 0.95rem; text-align: center;">
      Auto-calculated PAYG Withheld: <strong style="color: var(--emerald)">${formatCurrency(paygWithheld)}</strong> 
      <br><small style="color: var(--text-muted)">(Based on Base Pay of ${formatCurrency(basePay)})</small>
    </div>
  </div>`;

  html += `<div style="overflow-x: auto;">
  <table class="strategy-table" style="font-size: 0.95rem;">
    <thead>
      <tr>
        <th class="strategy-table__label"></th>
        <th class="strategy-table__col1">No extra super<br><small>Scenario 1</small></th>
        ${opt.extraContrib > 0 ? `<th class="strategy-table__col2">Option 1<br><small>${formatCurrency(opt.extraContrib)} Extra</small></th>` : `<th class="strategy-table__col2" style="opacity: 0.5;">Option 1<br><small>With Extra Super</small></th>`}
        ${showCol3 ? `<th class="strategy-table__col3">Option 2<br><small>${formatCurrency(opt2.extraContrib)} Extra</small></th>` : ''}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="strategy-table__label">${createTooltip('Employer Super Guarantee (SG)', 'Mandatory 12% contribution paid by your employer based on your Base Pay.')}</td>
        <td class="strategy-table__col1">${formatCurrency(sg)}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(sg)}</td>` : `<td class="strategy-table__col2" rowspan="8" style="vertical-align: middle; text-align: center; background: rgba(0,0,0,0.05); color: var(--text-muted);">
          <strong>Option 1</strong><br><br>No extra contribution.
        </td>`}
        ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(sg)}</td>` : ''}
      </tr>
      <tr>
        <td class="strategy-table__label">${createTooltip('Additional Super Contribution', 'Voluntary extra super contributions you choose to make.')}</td>
        <td class="strategy-table__col1">$0</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2 strategy-table__col2--highlight">+${formatCurrency(opt.extraContrib)}</td>` : ''}
        ${showCol3 ? `<td class="strategy-table__col3 strategy-table__col3--highlight">+${formatCurrency(opt2.extraContrib)}</td>` : ''}
      </tr>
      <tr>
        <td class="strategy-table__label">${createTooltip('Total Taxable Income', 'Base Pay + RSU + Net Capital Gains minus any deductible Extra Super.')}</td>
        <td class="strategy-table__col1">${formatCurrency(base.taxableIncome)}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(opt.taxableIncome)}</td>` : ''}
        ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(opt2.taxableIncome)}</td>` : ''}
      </tr>
      <tr>
        <td class="strategy-table__label">${createTooltip('Income Tax Payable', 'Calculated based on standard ATO tax brackets.')}</td>
        <td class="strategy-table__col1">${formatCurrency(base.incomeTaxAfterOffsets)}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(opt.incomeTaxAfterOffsets)}</td>` : ''}
        ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(opt2.incomeTaxAfterOffsets)}</td>` : ''}
      </tr>
      <tr>
        <td class="strategy-table__label">${createTooltip('Medicare Levy & MLS', 'Standard 2% Medicare Levy plus any applicable Medicare Levy Surcharge if you lack private health cover.')}</td>
        <td class="strategy-table__col1">${formatCurrency(Math.round(base.medicareLevy) + base.mls.amount)}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(Math.round(opt.medicareLevy) + opt.mls.amount)}</td>` : ''}
        ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(Math.round(opt2.medicareLevy) + opt2.mls.amount)}</td>` : ''}
      </tr>
      <tr class="strategy-table__row--total">
        <td class="strategy-table__label">${createTooltip('Total Income Tax Liability', 'Total tax owed on your taxable income, including Medicare and MLS.')}</td>
        <td class="strategy-table__col1">${formatCurrency(base.totalTaxLiability)}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(opt.totalTaxLiability)}</td>` : ''}
        ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(opt2.totalTaxLiability)}</td>` : ''}
      </tr>
      <tr>
        <td class="strategy-table__label">${createTooltip('15% Tax on Extra Super', 'The concessional tax rate applied to your extra super contributions upon entering the super fund.')}</td>
        <td class="strategy-table__col1">$0</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(opt.superTaxOnExtra)}</td>` : ''}
        ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(opt2.superTaxOnExtra)}</td>` : ''}
      </tr>
      <tr>
        <td class="strategy-table__label">${createTooltip('Div 293 Tax Assessment', 'Additional 15% tax on concessional super contributions for high income earners (Combined Income > $250k).')}</td>
        <td class="strategy-table__col1">${base.div293.applies ? formatCurrency(base.div293.tax) : '—'}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${opt.div293.applies ? formatCurrency(opt.div293.tax) : '—'}</td>` : ''}
        ${showCol3 ? `<td class="strategy-table__col3">${opt2.div293.applies ? formatCurrency(opt2.div293.tax) : '—'}</td>` : ''}
      </tr>
      <tr style="background: rgba(212, 165, 50, 0.05);">
        <td class="strategy-table__label" style="color: var(--gold);">${createTooltip('Net Super Balance Added', 'The actual amount added to your super balance after the 15% contributions tax and any Div 293 tax.')}</td>
        <td class="strategy-table__col1" style="font-weight: 700; color: var(--gold);">${formatCurrency(baseNetSuper)}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2 strategy-table__col2--highlight" style="font-weight: 700; color: var(--gold);">${formatCurrency(optNetSuper)}</td>` : ''}
        ${showCol3 ? `<td class="strategy-table__col3 strategy-table__col3--highlight" style="font-weight: 700; color: var(--gold);">${formatCurrency(opt2NetSuper)}</td>` : ''}
      </tr>
      <tr>
        <td class="strategy-table__label">${createTooltip('Net Extra Super Added', 'The portion of the net super balance that comes solely from your extra voluntary contributions.')}</td>
        <td class="strategy-table__col1">$0</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2 strategy-table__col2--highlight">+${formatCurrency(netOnlyExtraSuper)}</td>` : ''}
        ${showCol3 ? `<td class="strategy-table__col3 strategy-table__col3--highlight">+${formatCurrency(netOnlyExtraSuper2)}</td>` : ''}
      </tr>
      <tr class="strategy-table__row--total" style="border-top: 2px solid var(--border-medium);">
        <td class="strategy-table__label" style="color: var(--text-primary);">${createTooltip('Total Tax Bill to Pay (End of Year)', 'Your total tax liability minus the tax your employer already withheld (PAYG). A negative number is a refund.')}</td>
        <td class="strategy-table__col1" style="color: ${baseRemainingTax < 0 ? 'var(--emerald)' : 'var(--rose)'}">${baseRemainingTax < 0 ? 'Refund: ' : 'Owe: '}${formatCurrency(Math.abs(baseRemainingTax))}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2 strategy-table__col2--highlight" style="color: ${optRemainingTax < 0 ? 'var(--emerald)' : 'var(--rose)'}">${optRemainingTax < 0 ? 'Refund: ' : 'Owe: '}${formatCurrency(Math.abs(optRemainingTax))}</td>` : `<td class="strategy-table__col2" style="background: rgba(0,0,0,0.05);"></td>`}
        ${showCol3 ? `<td class="strategy-table__col3 strategy-table__col3--highlight" style="color: ${opt2RemainingTax < 0 ? 'var(--emerald)' : 'var(--rose)'}">${opt2RemainingTax < 0 ? 'Refund: ' : 'Owe: '}${formatCurrency(Math.abs(opt2RemainingTax))}</td>` : ''}
      </tr>
      <tr class="strategy-table__row--total" style="background: rgba(255,255,255,0.02);">
        <td class="strategy-table__label" style="color: var(--text-primary);">${createTooltip('Total Cash Required', 'The total out-of-pocket cash you need: the extra super contribution you made plus any tax bill you owe (or minus your refund).')}</td>
        <td class="strategy-table__col1" style="color: ${baseCashRequired <= 0 ? 'var(--emerald)' : 'var(--rose)'}">${baseCashRequired <= 0 ? 'Net Refund: ' : 'Out of Pocket: '}${formatCurrency(Math.abs(baseCashRequired))}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2 strategy-table__col2--highlight" style="color: ${optCashRequired <= 0 ? 'var(--emerald)' : 'var(--rose)'}">${optCashRequired <= 0 ? 'Net Refund: ' : 'Out of Pocket: '}${formatCurrency(Math.abs(optCashRequired))}</td>` : `<td class="strategy-table__col2" style="background: rgba(0,0,0,0.05);"></td>`}
        ${showCol3 ? `<td class="strategy-table__col3 strategy-table__col3--highlight" style="color: ${opt2CashRequired <= 0 ? 'var(--emerald)' : 'var(--rose)'}">${opt2CashRequired <= 0 ? 'Net Refund: ' : 'Out of Pocket: '}${formatCurrency(Math.abs(opt2CashRequired))}</td>` : ''}
      </tr>
    </tbody>
  </table>
  </div>`;

  if (opt.nonConcessionalExtra > 0 || opt2.nonConcessionalExtra > 0) {
    let msg = '';
    if (opt.nonConcessionalExtra > 0 && opt2.nonConcessionalExtra > 0) {
      msg = `Both of your scenarios exceed your remaining cap (${formatCurrency(Math.max(0, concCap - sg))}) and have been split into concessional and non-concessional components.`;
    } else if (opt.nonConcessionalExtra > 0) {
      msg = `<strong>Option 1</strong> total extra contribution (${formatCurrency(opt.extraContrib)}) exceeds your remaining cap. It has been split into <strong>${formatCurrency(opt.concessionalExtra)} concessional</strong> and <strong>${formatCurrency(opt.nonConcessionalExtra)} non-concessional</strong> contributions.`;
    } else {
      msg = `<strong>Option 2</strong> total extra contribution (${formatCurrency(opt2.extraContrib)}) exceeds your remaining cap. It has been split into <strong>${formatCurrency(opt2.concessionalExtra)} concessional</strong> and <strong>${formatCurrency(opt2.nonConcessionalExtra)} non-concessional</strong> contributions.`;
    }

    html += `<div class="notice notice--warning" style="margin-top: var(--space-xl);">
      <span class="notice__icon">ℹ️</span>
      <span>${msg}</span>
    </div>`;
  }

  // Div 293 Detailed Breakdown
  html += renderDiv293Box(base, opt, opt2, sg, showCol3);

  // --- SAVINGS HERO BOXES ---
  if (opt.extraContrib > 0 || opt2.extraContrib > 0) {
    html += `<div style="display: flex; gap: var(--space-lg); margin-top: var(--space-xl); flex-wrap: wrap;">`;
    
    // Option 1 Box
    if (opt.extraContrib > 0) {
      const netBenefit = netOnlyExtraSuper - (optCashRequired - baseCashRequired);
      html += renderSavingsBox("Option 1", netBenefit, opt.extraContrib);
    }
    
    // Option 2 Box
    if (showCol3) {
      const netBenefit2 = netOnlyExtraSuper2 - (opt2CashRequired - baseCashRequired);
      html += renderSavingsBox("Option 2", netBenefit2, opt2.extraContrib);
    }
    
    html += `</div>`;
  }

  el.innerHTML = html;
  
  // Staggered card animations (only on initial reveal)
  document.querySelectorAll('.card--result').forEach((card, index) => {
    if (!card.classList.contains('animate-in')) {
      void card.offsetWidth;
      setTimeout(() => card.classList.add('animate-in'), index * 120);
    }
  });
}

function renderSavingsBox(title, benefit, extraContrib) {
  const isPositive = benefit > 0;
  const percentStr = extraContrib > 0 ? ` <span style="font-size: 0.5em; opacity: 0.8; vertical-align: middle;">(${formatPercent(Math.abs(benefit) / extraContrib, 1)})</span>` : '';
  return `
    <div style="flex: 1; min-width: 250px; padding: var(--space-lg); background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); text-align: center;">
      <div style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: var(--space-sm);">${title}</div>
      <div style="font-size: 1.1rem; font-weight: 500; margin-bottom: var(--space-xs);">Overall Net Cash Benefit</div>
      <div style="font-size: 2rem; font-weight: 700; color: ${isPositive ? 'var(--emerald)' : 'var(--rose)'}; margin-bottom: var(--space-xs); display: flex; align-items: baseline; justify-content: center; gap: 4px;">
        ${isPositive ? '+' : ''}${formatCurrency(benefit)}${percentStr}
      </div>
      <div style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.4;">
        This is the true value you gain, taking into account the extra cash you paid vs. the net super you gained.
      </div>
    </div>
  `;
}

function renderDiv293Box(base, opt, opt2, sg, showCol3) {
  const baseSuper = sg;
  const optSuper = sg + opt.concessionalExtra;
  const opt2Super = sg + opt2.concessionalExtra;

  return `
  <div class="card--result animate-in" style="margin-top: var(--space-xl); padding: var(--space-lg); background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-lg);">
    <h3 style="margin-bottom: var(--space-md); font-size: 1.1rem; color: var(--text-primary);">Division 293 Tax Detailed Breakdown</h3>
    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: var(--space-md);">
      Division 293 tax is an additional 15% tax charged on your concessional super contributions if your combined income and super exceed the $250,000 threshold.
    </p>
    <div style="overflow-x: auto;">
      <table class="strategy-table" style="font-size: 0.9rem;">
        <thead>
          <tr>
            <th class="strategy-table__label"></th>
            <th class="strategy-table__col1">No extra super<br><small>Scenario 1</small></th>
            ${opt.extraContrib > 0 ? `<th class="strategy-table__col2">Option 1<br><small>${formatCurrency(opt.extraContrib)} Extra</small></th>` : `<th class="strategy-table__col2" style="opacity: 0.5;">Option 1<br><small>With Extra Super</small></th>`}
            ${showCol3 ? `<th class="strategy-table__col3">Option 2<br><small>${formatCurrency(opt2.extraContrib)} Extra</small></th>` : ''}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="strategy-table__label">Taxable Income for Div 293<br><small>Taxable Income + RFBA</small></td>
            <td class="strategy-table__col1">${formatCurrency(base.div293.income - baseSuper)}</td>
            ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(opt.div293.income - optSuper)}</td>` : `<td class="strategy-table__col2" rowspan="6" style="background: rgba(0,0,0,0.05);"></td>`}
            ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(opt2.div293.income - opt2Super)}</td>` : ''}
          </tr>
          <tr>
            <td class="strategy-table__label">Concessional Super Contributions<br><small>Employer SG + Deductible Extra</small></td>
            <td class="strategy-table__col1">${formatCurrency(baseSuper)}</td>
            ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(optSuper)}</td>` : ''}
            ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(opt2Super)}</td>` : ''}
          </tr>
          <tr style="background: rgba(255,255,255,0.02);">
            <td class="strategy-table__label" style="font-weight:600;">Combined Income for Div 293</td>
            <td class="strategy-table__col1" style="font-weight:600;">${formatCurrency(base.div293.income)}</td>
            ${opt.extraContrib > 0 ? `<td class="strategy-table__col2" style="font-weight:600;">${formatCurrency(opt.div293.income)}</td>` : ''}
            ${showCol3 ? `<td class="strategy-table__col3" style="font-weight:600;">${formatCurrency(opt2.div293.income)}</td>` : ''}
          </tr>
          <tr>
            <td class="strategy-table__label">Excess over $250,000 threshold</td>
            <td class="strategy-table__col1">${formatCurrency(base.div293.excess)}</td>
            ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(opt.div293.excess)}</td>` : ''}
            ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(opt2.div293.excess)}</td>` : ''}
          </tr>
          <tr>
            <td class="strategy-table__label">Amount Subject to Div 293<br><small>Lesser of Excess or Concessional Super</small></td>
            <td class="strategy-table__col1">${formatCurrency(base.div293.taxableAmount)}</td>
            ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(opt.div293.taxableAmount)}</td>` : ''}
            ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(opt2.div293.taxableAmount)}</td>` : ''}
          </tr>
          <tr class="strategy-table__row--total" style="border-top: 2px solid var(--border-medium);">
            <td class="strategy-table__label" style="color: var(--rose);">Div 293 Tax (15%)</td>
            <td class="strategy-table__col1" style="color: var(--rose);">${formatCurrency(base.div293.tax)}</td>
            ${opt.extraContrib > 0 ? `<td class="strategy-table__col2 strategy-table__col2--highlight" style="color: var(--rose);">${formatCurrency(opt.div293.tax)}</td>` : ''}
            ${showCol3 ? `<td class="strategy-table__col3 strategy-table__col3--highlight" style="color: var(--rose);">${formatCurrency(opt2.div293.tax)}</td>` : ''}
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

// ── Form Submission ────────────────────────────
document.getElementById('taxForm').addEventListener('submit', (e) => {
  e.preventDefault();
});

// Initial setup
updateWizard();

// ── Theme Management ───────────────────────────
const THEME_KEY = 'swc-theme-preference';
const themeSwitcher = document.getElementById('themeSwitcher');
const themeIndicator = document.getElementById('themeIndicator');

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(preference) {
  const resolved = preference === 'system' ? getSystemTheme() : preference;
  document.documentElement.setAttribute('data-theme', resolved);

  // Update button states
  themeSwitcher.querySelectorAll('.theme-switcher__btn').forEach(btn => {
    btn.setAttribute('aria-checked', btn.dataset.theme === preference);
  });

  // Slide indicator
  updateThemeIndicator(preference);
}

function updateThemeIndicator(preference) {
  const activeBtn = themeSwitcher.querySelector(`[data-theme="${preference}"]`);
  if (activeBtn && themeIndicator) {
    const parentRect = themeSwitcher.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    themeIndicator.style.width = btnRect.width + 'px';
    themeIndicator.style.transform = `translateX(${btnRect.left - parentRect.left - 4}px)`;
  }
}

function getThemePref() {
  try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (e) { return 'system'; }
}

function setThemePref(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

// Initialize theme from localStorage
const savedTheme = getThemePref();
applyTheme(savedTheme);

window.addEventListener('load', () => {
  updateThemeIndicator(getThemePref());
});

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (getThemePref() === 'system') applyTheme('system');
});

themeSwitcher.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-switcher__btn');
  if (!btn) return;
  const theme = btn.dataset.theme;
  setThemePref(theme);
  applyTheme(theme);
});

// ── Clear Data Functionality ───────────────────
const clearDataBtn = document.getElementById('clearDataBtn');
if (clearDataBtn) {
  clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all your saved financial data and reset the calculator?')) {
      localStorage.clear();
      window.location.reload();
    }
  });
}
