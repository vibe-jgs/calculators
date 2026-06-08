/* ═══════════════════════════════════════════════
   AUSTRALIAN TAX CALCULATOR — FY 2025-26
   ═══════════════════════════════════════════════ */

// ── Tax Configuration ──────────────────────────
const CONFIG = {
  financialYear: '2025-26',
  superRate: 0.12, // 12% SG for FY 2025-26
  medicareLevyRate: 0.02, // 2% Medicare Levy
  div293Threshold: 250_000,
  div293Rate: 0.15,

  // FY 2025-26 Income Tax Brackets (Stage 3 tax cuts)
  taxBrackets: [
    { min: 0,       max: 18_200,    rate: 0,    base: 0,      label: '$0 – $18,200' },
    { min: 18_201,  max: 45_000,    rate: 0.16, base: 0,      label: '$18,201 – $45,000' },
    { min: 45_001,  max: 135_000,   rate: 0.30, base: 4_288,  label: '$45,001 – $135,000' },
    { min: 135_001, max: 190_000,   rate: 0.37, base: 31_288, label: '$135,001 – $190,000' },
    { min: 190_001, max: Infinity,  rate: 0.45, base: 51_638, label: '$190,001+' },
  ],

  // Medicare Levy Surcharge thresholds (singles, FY 2025-26)
  mlsSingles: [
    { min: 0,       max: 101_000, rate: 0 },
    { min: 101_001, max: 118_000, rate: 0.01 },
    { min: 118_001, max: 158_000, rate: 0.0125 },
    { min: 158_001, max: Infinity, rate: 0.015 },
  ],
};


// ── DOM References ─────────────────────────────
const form = document.getElementById('taxForm');
const basePayInput = document.getElementById('basePay');
const rfbaInput = document.getElementById('rfbaValue');
const rsuInput = document.getElementById('rsuValue');
const cgtInput = document.getElementById('capitalGains');
const carryForwardInput = document.getElementById('carryForward');
const extraSuperInput = document.getElementById('extraSuper');
const extraSuperInput2 = document.getElementById('extraSuper2');
const cgtToggle = document.getElementById('cgtDiscount');
const phiToggle = document.getElementById('privateHealth');
const resultsSection = document.getElementById('results');



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
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyFull(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value, decimals = 1) {
  return (value * 100).toFixed(decimals) + '%';
}

function parseInputValue(input) {
  const raw = input.value.replace(/[^0-9.]/g, '');
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

  const num = parseInt(raw, 10);
  const formatted = num.toLocaleString('en-AU');
  input.value = formatted;

  // Restore cursor position
  const diff = formatted.length - rawBefore.length;
  const newPos = Math.max(0, cursorPos + diff);
  requestAnimationFrame(() => {
    input.setSelectionRange(newPos, newPos);
  });
}

[basePayInput, rfbaInput, rsuInput, cgtInput, carryForwardInput, extraSuperInput, extraSuperInput2].forEach(input => {
  if (!input) return;
  input.addEventListener('input', (e) => {
    handleCurrencyInput(e);
    performCalculation();
  });
});


// ── Toggle Switches ────────────────────────────
function setupToggle(toggle) {
  toggle.addEventListener('click', () => {
    const current = toggle.getAttribute('aria-checked') === 'true';
    toggle.setAttribute('aria-checked', !current);
    performCalculation();
  });
}

setupToggle(cgtToggle);
setupToggle(phiToggle);


// ── State Persistence ──────────────────────────
const STATE_KEY = 'swc-input-state';

async function saveState() {
  try {
    const state = {
      basePay: parseInputValue(basePayInput),
      rfba: parseInputValue(rfbaInput),
      rsuValue: parseInputValue(rsuInput),
      capitalGains: parseInputValue(cgtInput),
      carryForward: parseInputValue(carryForwardInput),
      extraSuper: parseInputValue(extraSuperInput),
      extraSuper2: parseInputValue(extraSuperInput2),
      cgtDiscount: cgtToggle.getAttribute('aria-checked') === 'true',
      privateHealth: phiToggle.getAttribute('aria-checked') === 'true',
    };
    if (typeof encryptState === 'function') {
      const encrypted = await encryptState(state);
      if (encrypted) localStorage.setItem(STATE_KEY, JSON.stringify(encrypted));
    }
  } catch (e) {}
}

async function loadState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      const encryptedObj = JSON.parse(saved);
      let state = null;
      if (typeof decryptState === 'function') {
        state = await decryptState(encryptedObj);
      }
      
      if (state) {
        if (state.basePay) basePayInput.value = state.basePay.toLocaleString('en-AU');
        if (state.rfba && rfbaInput) rfbaInput.value = state.rfba.toLocaleString('en-AU');
        if (state.rsuValue) rsuInput.value = state.rsuValue.toLocaleString('en-AU');
        if (state.capitalGains) cgtInput.value = state.capitalGains.toLocaleString('en-AU');
        if (state.carryForward) carryForwardInput.value = state.carryForward.toLocaleString('en-AU');
        if (state.extraSuper) extraSuperInput.value = state.extraSuper.toLocaleString('en-AU');
        if (state.extraSuper2 && extraSuperInput2) extraSuperInput2.value = state.extraSuper2.toLocaleString('en-AU');
        
        if (state.cgtDiscount !== undefined) cgtToggle.setAttribute('aria-checked', state.cgtDiscount);
        if (state.privateHealth !== undefined) phiToggle.setAttribute('aria-checked', state.privateHealth);
      }
    }
  } catch (e) {}
}


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
// Re-measure after fonts load
window.addEventListener('load', () => {
  updateThemeIndicator(getThemePref());
});

// Listen for OS theme changes (only matters when set to "system")
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (getThemePref() === 'system') applyTheme('system');
});

// Switcher click handler
themeSwitcher.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-switcher__btn');
  if (!btn) return;
  const theme = btn.dataset.theme;
  setThemePref(theme);
  applyTheme(theme);
});


// ── Tax Calculations ───────────────────────────

/**
 * Calculate income tax using progressive brackets
 * Returns { total, breakdown[] }
 */
function calculateIncomeTax(taxableIncome) {
  const breakdown = [];
  let totalTax = 0;

  for (const bracket of CONFIG.taxBrackets) {
    const bracketMin = bracket.min;
    const bracketMax = bracket.max;
    const isActive = taxableIncome >= bracketMin;
    let taxableInBracket = 0;
    let taxForBracket = 0;

    if (isActive) {
      if (bracketMin === 0) {
        // Tax-free threshold
        taxableInBracket = Math.min(taxableIncome, bracketMax);
        taxForBracket = 0;
      } else {
        const upperBound = Math.min(taxableIncome, bracketMax);
        taxableInBracket = Math.max(0, upperBound - bracketMin + 1);
        taxForBracket = taxableInBracket * bracket.rate;
      }
    }

    breakdown.push({
      label: bracket.label,
      rate: bracket.rate,
      taxable: taxableInBracket,
      tax: taxForBracket,
      active: isActive && taxableInBracket > 0,
    });

    totalTax += taxForBracket;
  }

  return { total: totalTax, breakdown };
}

/**
 * Calculate Low Income Tax Offset (LITO) for FY 2025-26
 */
function calculateLITO(taxableIncome) {
  if (taxableIncome <= 37_500) return 700;
  if (taxableIncome <= 45_000) return Math.max(0, 700 - (taxableIncome - 37_500) * 0.05);
  if (taxableIncome <= 66_667) return Math.max(0, 325 - (taxableIncome - 45_000) * 0.015);
  return 0;
}

/**
 * Calculate Medicare Levy
 */
function calculateMedicareLevy(taxableIncome) {
  // Simplified: full 2% for incomes above the threshold
  // Low income thresholds are not applied as the target user likely has high income
  return taxableIncome * CONFIG.medicareLevyRate;
}

/**
 * Calculate Medicare Levy Surcharge (if no private health insurance)
 */
function calculateMLS(taxableIncome, hasPrivateHealth, rfba = 0) {
  if (hasPrivateHealth) return { rate: 0, amount: 0 };

  const incomeForMLS = taxableIncome + rfba;

  for (const tier of CONFIG.mlsSingles) {
    if (incomeForMLS >= tier.min && incomeForMLS <= tier.max) {
      return {
        rate: tier.rate,
        amount: tier.rate > 0 ? Math.round(incomeForMLS * tier.rate) : 0,
      };
    }
  }

  // Above all thresholds
  const lastTier = CONFIG.mlsSingles[CONFIG.mlsSingles.length - 1];
  return {
    rate: lastTier.rate,
    amount: Math.round(incomeForMLS * lastTier.rate),
  };
}

/**
 * Calculate Super Guarantee
 * OTE = Base Pay (RSUs and Capital Gains are not OTE)
 */
function calculateSuperGuarantee(basePay, rsuValue) {
  const ote = basePay;
  const sg = Math.round(ote * CONFIG.superRate);
  return { ote, rate: CONFIG.superRate, amount: sg };
}

/**
 * Calculate Division 293 tax
 * Additional 15% on super if income + super > $250,000
 */
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


// ── Main Calculation ───────────────────────────

/**
 * Calculate Employer PAYG Withheld
 * Calculates standard income tax + Medicare levy strictly on the base pay.
 */
function calculateEmployerPAYG(basePay) {
  const taxResult = calculateIncomeTax(basePay);
  const lito = calculateLITO(basePay);
  const incomeTax = Math.max(0, taxResult.total - lito);
  const medicareLevy = calculateMedicareLevy(basePay);
  return incomeTax + medicareLevy;
}

function calculateScenario(taxableIncome, superGuaranteeAmount, concessionalExtra, nonConcessionalExtra, hasPrivateHealth, rfba = 0) {
  const taxResult = calculateIncomeTax(taxableIncome);
  const lito = calculateLITO(taxableIncome);
  const incomeTaxAfterOffsets = Math.max(0, taxResult.total - lito);

  const medicareLevy = calculateMedicareLevy(taxableIncome);
  const mls = calculateMLS(taxableIncome, hasPrivateHealth, rfba);

  const totalExtra = concessionalExtra + nonConcessionalExtra;
  const totalSuper = superGuaranteeAmount + totalExtra;
  
  // Tax is ONLY applied to the concessional (before-tax) contribution
  const superTaxOnExtra = Math.round(concessionalExtra * 0.15); 

  // Non-concessional contributions are ignored for Div 293 income limits
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

function performCalculation() {
  // Parse inputs
  const basePay = parseInputValue(basePayInput);
  const rfba = parseInputValue(rfbaInput);
  const rsuValue = parseInputValue(rsuInput);
  const grossCapitalGains = parseInputValue(cgtInput);
  const hasCgtDiscount = cgtToggle.getAttribute('aria-checked') === 'true';
  const hasPrivateHealth = phiToggle.getAttribute('aria-checked') === 'true';
  const carryForward = parseInputValue(carryForwardInput) || 0;
  const concCap = 30_000 + carryForward;

  // Calculate net capital gain
  const cgtDiscount = hasCgtDiscount ? grossCapitalGains * 0.5 : 0;
  const netCapitalGain = grossCapitalGains - cgtDiscount;

  // Auto-calculate Employer PAYG
  const paygWithheld = calculateEmployerPAYG(basePay);

  // Super Guarantee
  const superResult = calculateSuperGuarantee(basePay, rsuValue);
  const sg = superResult.amount;
  
  // Total taxable income (Base Case)
  const taxableIncomeBase = basePay + rsuValue + netCapitalGain;

  // BASE SCENARIO
  const baseData = calculateScenario(taxableIncomeBase, sg, 0, 0, hasPrivateHealth, rfba);
  baseData.basePay = basePay;
  baseData.rsuValue = rsuValue;
  baseData.grossCapitalGains = grossCapitalGains;
  baseData.cgtDiscount = cgtDiscount;
  baseData.netCapitalGain = netCapitalGain;
  baseData.superResult = superResult;
  baseData.concCap = concCap;
  baseData.paygWithheld = paygWithheld;

  // Remaining Cap Check
  const remainingCap = Math.max(0, concCap - sg);

  // OPTIMIZED SCENARIO (Using user's exact extra contribution input)
  const extraContrib = parseInputValue(extraSuperInput) || 0;
  const extraContrib2 = parseInputValue(extraSuperInput2) || 0;
  
  // Split into Concessional and Non-Concessional
  const concessionalExtra = Math.min(extraContrib, remainingCap);
  const nonConcessionalExtra = Math.max(0, extraContrib - remainingCap);

  if (nonConcessionalExtra > 0) {
    showToast(
      "Cap Exceeded: Contribution Split",
      `Your Option 1 contribution (${formatCurrency(extraContrib)}) exceeds your remaining cap. It has been split into a ${formatCurrency(concessionalExtra)} concessional (deductible) contribution and a ${formatCurrency(nonConcessionalExtra)} non-concessional (after-tax) personal contribution.`
    );
  } else if (extraContrib > 0) {
    hideToast(); // Hide if they correct it back under the cap
  }

  const taxableIncomeOpt = taxableIncomeBase - concessionalExtra;
  const optData = calculateScenario(taxableIncomeOpt, sg, concessionalExtra, nonConcessionalExtra, hasPrivateHealth, rfba);

  // OPTIMIZED SCENARIO 2
  const concessionalExtra2 = Math.min(extraContrib2, remainingCap);
  const nonConcessionalExtra2 = Math.max(0, extraContrib2 - remainingCap);
  const taxableIncomeOpt2 = taxableIncomeBase - concessionalExtra2;
  const optData2 = calculateScenario(taxableIncomeOpt2, sg, concessionalExtra2, nonConcessionalExtra2, hasPrivateHealth, rfba);

  // Render the side-by-side dashboard
  renderComparisonDashboard(baseData, optData, optData2);
  
  // Save state for next visit
  saveState();
}

// ── Render Dashboard ───────────────────────────

function renderComparisonDashboard(base, opt, opt2) {
  const el = document.getElementById('dashboardSummary');
  
  // Savings calculations
  const incomeTaxSaving = base.totalTaxLiability - opt.totalTaxLiability;
  const div293Increase = opt.div293.tax - base.div293.tax;
  const netSaving = incomeTaxSaving - opt.superTaxOnExtra - Math.max(0, div293Increase);

  const incomeTaxSaving2 = base.totalTaxLiability - opt2.totalTaxLiability;
  const div293Increase2 = opt2.div293.tax - base.div293.tax;
  const netSaving2 = incomeTaxSaving2 - opt2.superTaxOnExtra - Math.max(0, div293Increase2);

  const baseRemainingTax = base.totalTaxLiability - base.paygWithheld;
  const optRemainingTax = opt.totalTaxLiability - base.paygWithheld;
  const opt2RemainingTax = opt2.totalTaxLiability - base.paygWithheld;

  const baseCashRequired = baseRemainingTax;
  const optCashRequired = optRemainingTax + opt.extraContrib;
  const opt2CashRequired = opt2RemainingTax + opt2.extraContrib;

  // Net Super Added
  const baseNetSuper = base.superResult.amount - Math.round(base.superResult.amount * 0.15) - base.div293.tax;
  
  const optTotalSuper = base.superResult.amount + opt.extraContrib;
  const optConcessionalTotal = base.superResult.amount + opt.concessionalExtra;
  const optNetSuper = optTotalSuper - Math.round(optConcessionalTotal * 0.15) - opt.div293.tax;
  const netOnlyExtraSuper = optNetSuper - baseNetSuper;

  const opt2TotalSuper = base.superResult.amount + opt2.extraContrib;
  const opt2ConcessionalTotal = base.superResult.amount + opt2.concessionalExtra;
  const opt2NetSuper = opt2TotalSuper - Math.round(opt2ConcessionalTotal * 0.15) - opt2.div293.tax;
  const netOnlyExtraSuper2 = opt2NetSuper - baseNetSuper;

  const showCol3 = opt2.extraContrib > 0;

  let html = '';

  // Context Header
  html += `<div class="strategy-header" style="justify-content: center; margin-bottom: var(--space-xl);">
    <div class="strategy-header__info" style="font-size: 0.95rem; text-align: center;">
      Auto-calculated PAYG Withheld: <strong style="color: var(--emerald)">${formatCurrency(base.paygWithheld)}</strong> 
      <br><small style="color: var(--text-muted)">(Based on Base Pay of ${formatCurrency(base.basePay)})</small>
    </div>
  </div>`;

  // Master Table
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
        <td class="strategy-table__col1">${formatCurrency(base.superResult.amount)}</td>
        ${opt.extraContrib > 0 ? `<td class="strategy-table__col2">${formatCurrency(base.superResult.amount)}</td>` : `<td class="strategy-table__col2" rowspan="8" style="vertical-align: middle; text-align: center; background: rgba(0,0,0,0.05); color: var(--text-muted);">
          Enter an extra super<br>contribution in the form<br>to see a comparison.
        </td>`}
        ${showCol3 ? `<td class="strategy-table__col3">${formatCurrency(base.superResult.amount)}</td>` : ''}
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

  // Savings Hero Boxes
  if (opt.extraContrib > 0 || opt2.extraContrib > 0) {
    html += `<div style="display: flex; gap: var(--space-lg); margin-top: var(--space-xl); flex-wrap: wrap;">`;
    
    // Option 1 Box
    if (opt.extraContrib > 0) {
      const netBenefit = netOnlyExtraSuper - (optCashRequired - baseCashRequired);
      html += renderAppSavingsBox("Option 1", netBenefit, incomeTaxSaving, opt.superTaxOnExtra, div293Increase, opt.extraContrib);
    }
    
    // Option 2 Box
    if (showCol3) {
      const netBenefit2 = netOnlyExtraSuper2 - (opt2CashRequired - baseCashRequired);
      html += renderAppSavingsBox("Option 2", netBenefit2, incomeTaxSaving2, opt2.superTaxOnExtra, div293Increase2, opt2.extraContrib);
    }
    
    html += `</div>`;
  } else {
    html += `<div class="strategy-na" style="margin-top: var(--space-xl);">
      <div class="strategy-na__icon">✅</div>
      <p>Your employer SG of <strong>${formatCurrency(base.superResult.amount)}</strong> already meets or exceeds your concessional cap of <strong>${formatCurrency(base.concCap)}</strong>.</p>
      <p style="margin-top: 8px;">No additional concessional contributions available.</p>
    </div>`;
  }

  // Excess Cap Warning
  if (opt.nonConcessionalExtra > 0 || opt2.nonConcessionalExtra > 0) {
    let msg = '';
    if (opt.nonConcessionalExtra > 0 && opt2.nonConcessionalExtra > 0) {
      msg = `Both of your scenarios exceed your remaining cap (${formatCurrency(Math.max(0, base.concCap - base.superResult.amount))}) and have been split into concessional and non-concessional components.`;
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
  html += renderDiv293Box(base, opt, opt2, base.superResult.amount, showCol3);

  el.innerHTML = html;
  showResults();
}

function renderAppSavingsBox(title, benefit, incomeTaxSaving, superTax, div293Increase, extraContrib) {
  const isPositive = benefit >= 0;
  const percentStr = extraContrib > 0 ? ` <span style="font-size: 0.6em; opacity: 0.8; font-weight: 600;">(${formatPercent(Math.abs(benefit) / extraContrib, 1)})</span>` : '';
  return `
    <div class="strategy-saving" style="flex: 1; min-width: 250px; margin-top: 0;">
      <div class="strategy-saving__title">${title}: Overall Net Cash Benefit</div>
      <div class="strategy-saving-hero" style="margin: var(--space-md) 0; align-items: baseline;">
        <div class="strategy-saving-hero__label">${isPositive ? 'You Save' : 'Additional Cost'}</div>
        <div class="strategy-saving-hero__amount">${isPositive ? '' : '−'}${formatCurrency(Math.abs(benefit))}${percentStr}</div>
      </div>
      <div class="strategy-saving__breakdown">
        <span>Income Tax Saving: <strong>${formatCurrency(incomeTaxSaving)}</strong></span>
        <span>Less 15% Super Tax: <strong>${formatCurrency(superTax)}</strong></span>
        ${div293Increase > 0 ? `<span>Less Extra Div 293: <strong>${formatCurrency(div293Increase)}</strong></span>` : ''}
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

function showResults() {
  resultsSection.classList.add('visible');

  // Staggered card animations
  const cards = resultsSection.querySelectorAll('.card--result');
  cards.forEach((card, index) => {
    card.classList.remove('animate-in');
    // Force reflow
    void card.offsetWidth;
    setTimeout(() => {
      card.classList.add('animate-in');
    }, index * 120);
  });
}


// ── Form Submission ────────────────────────────
form.addEventListener('submit', (e) => {
  e.preventDefault();
});

// ── Toast Notification ─────────────────────────
const toastEl = document.getElementById('toast');
const toastTitle = document.getElementById('toastTitle');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');
let toastTimeout;

function showToast(title, message) {
  if (!toastEl) return;
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  toastEl.setAttribute('aria-hidden', 'false');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(hideToast, 12000); // Auto-hide after 12 seconds
}

function hideToast() {
  if (!toastEl) return;
  toastEl.setAttribute('aria-hidden', 'true');
}

if (toastClose) {
  toastClose.addEventListener('click', hideToast);
}

// ── Initial Render ─────────────────────────────
(async function init() {
  await loadState();
  performCalculation();
})();

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
