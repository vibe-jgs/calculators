/* ═══════════════════════════════════════════════
   SHARED SUPER WEALTH ENGINE — FY 2025-26
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
  if (!input) return 0;
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
  // ATO 2024-25 thresholds for singles
  if (taxableIncome <= 26000) return 0;
  if (taxableIncome <= 32500) return (taxableIncome - 26000) * 0.10;
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
function calculateSuperGuarantee(basePay) {
  const maxContributionBase = 260280; // 2025-26 Maximum super contribution base p.a.
  const ote = Math.min(basePay, maxContributionBase);
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
  
  // ATO Rule: "Income for MLS purposes" must add back reportable (deductible) super contributions
  const incomeForMLS = taxableIncome + concessionalExtra;
  const mls = calculateMLS(incomeForMLS, hasPrivateHealth, rfba);

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
