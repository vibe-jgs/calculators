const fs = require('fs');

function processFile(filename) {
  let content = fs.readFileSync(filename, 'utf8');

  // Add the createTooltip function if it doesn't exist
  if (!content.includes('function createTooltip')) {
    const fn = `
function createTooltip(title, text) {
  if (!text) return title;
  return \`
    <div style="display: flex; align-items: center; gap: 6px; position: relative;">
      <span>\${title}</span>
      <div class="info-tooltip">
        <span class="info-tooltip__icon">?</span>
        <div class="info-tooltip__text">\${text}</div>
      </div>
    </div>
  \`;
}
`;
    // Insert after DOM References
    content = content.replace('// ── Input Formatting ───────────────────────────', fn + '\n// ── Input Formatting ───────────────────────────');
  }

  // Replace labels in app.js / wizard.js
  const replacements = [
    {
      old: `<td class="strategy-table__label">Employer Super Guarantee (SG)<br><small style="font-weight:400;color:var(--text-muted)">12% of Base Pay</small></td>`,
      new: `<td class="strategy-table__label">\${createTooltip('Employer Super Guarantee (SG)', 'Mandatory 12% contribution paid by your employer based on your Base Pay.')}</td>`
    },
    {
      old: `<td class="strategy-table__label">Additional Super Contribution</td>`,
      new: `<td class="strategy-table__label">\${createTooltip('Additional Super Contribution', 'Voluntary extra super contributions you choose to make.')}</td>`
    },
    {
      old: `<td class="strategy-table__label">Total Taxable Income<br><small style="font-weight:400;color:var(--text-muted)">Base + RSU + CGT - Deductions</small></td>`,
      new: `<td class="strategy-table__label">\${createTooltip('Total Taxable Income', 'Base Pay + RSU + Net Capital Gains minus any deductible Extra Super.')}</td>`
    },
    {
      old: `<td class="strategy-table__label">Total Taxable Income</td>`, // wizard.js
      new: `<td class="strategy-table__label">\${createTooltip('Total Taxable Income', 'Base Pay + RSU + Net Capital Gains minus any deductible Extra Super.')}</td>`
    },
    {
      old: `<td class="strategy-table__label">Income Tax Payable</td>`,
      new: `<td class="strategy-table__label">\${createTooltip('Income Tax Payable', 'Calculated based on standard ATO tax brackets.')}</td>`
    },
    {
      old: `<td class="strategy-table__label">Medicare Levy & MLS</td>`,
      new: `<td class="strategy-table__label">\${createTooltip('Medicare Levy & MLS', 'Standard 2% Medicare Levy plus any applicable Medicare Levy Surcharge if you lack private health cover.')}</td>`
    },
    {
      old: `<td class="strategy-table__label">Total Income Tax Liability</td>`,
      new: `<td class="strategy-table__label">\${createTooltip('Total Income Tax Liability', 'Total tax owed on your taxable income, including Medicare and MLS.')}</td>`
    },
    {
      old: `<td class="strategy-table__label">15% Tax on Extra Super</td>`,
      new: `<td class="strategy-table__label">\${createTooltip('15% Tax on Extra Super', 'The concessional tax rate applied to your extra super contributions upon entering the super fund.')}</td>`
    },
    {
      old: `<td class="strategy-table__label">Div 293 Tax Assessment</td>`,
      new: `<td class="strategy-table__label">\${createTooltip('Div 293 Tax Assessment', 'Additional 15% tax on concessional super contributions for high income earners (Combined Income > $250k).')}</td>`
    },
    {
      old: `<td class="strategy-table__label" style="color: var(--gold);">Net Super Balance Added<br><small style="font-weight:400;color:var(--text-muted)">After 15% Tax & Div 293</small></td>`,
      new: `<td class="strategy-table__label" style="color: var(--gold);">\${createTooltip('Net Super Balance Added', 'The actual amount added to your super balance after the 15% contributions tax and any Div 293 tax.')}</td>`
    },
    {
      old: `<td class="strategy-table__label">Net Extra Super Added<br><small style="font-weight:400;color:var(--text-muted)">Excluding Employer SG</small></td>`,
      new: `<td class="strategy-table__label">\${createTooltip('Net Extra Super Added', 'The portion of the net super balance that comes solely from your extra voluntary contributions.')}</td>`
    },
    {
      old: `<td class="strategy-table__label" style="color: var(--text-primary);">Total Tax Bill to Pay (End of Year)<br><small style="font-weight:400;color:var(--text-muted)">Liability - Auto PAYG Withheld</small></td>`,
      new: `<td class="strategy-table__label" style="color: var(--text-primary);">\${createTooltip('Total Tax Bill to Pay (End of Year)', 'Your total tax liability minus the tax your employer already withheld (PAYG). A negative number is a refund.')}</td>`
    },
    {
      old: `<td class="strategy-table__label" style="color: var(--text-primary);">Total Tax Bill to Pay (End of Year)</td>`, // wizard.js
      new: `<td class="strategy-table__label" style="color: var(--text-primary);">\${createTooltip('Total Tax Bill to Pay (End of Year)', 'Your total tax liability minus the tax your employer already withheld (PAYG). A negative number is a refund.')}</td>`
    },
    {
      old: `<td class="strategy-table__label" style="color: var(--text-primary);">Total Cash Required<br><small style="font-weight:400;color:var(--text-muted)">Extra Super Contribution + Tax Bill</small></td>`,
      new: `<td class="strategy-table__label" style="color: var(--text-primary);">\${createTooltip('Total Cash Required', 'The total out-of-pocket cash you need: the extra super contribution you made plus any tax bill you owe (or minus your refund).')}</td>`
    },
    {
      old: `<td class="strategy-table__label" style="color: var(--text-primary);">Total Cash Required</td>`, // wizard.js
      new: `<td class="strategy-table__label" style="color: var(--text-primary);">\${createTooltip('Total Cash Required', 'The total out-of-pocket cash you need: the extra super contribution you made plus any tax bill you owe (or minus your refund).')}</td>`
    }
  ];

  replacements.forEach(r => {
    content = content.replace(r.old, r.new);
  });

  fs.writeFileSync(filename, content);
}

processFile('app.js');
processFile('wizard.js');
console.log('Done');
