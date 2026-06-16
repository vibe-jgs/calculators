# Super Wealth Calculator

An advanced, comprehensive Australian Tax and Superannuation strategy calculator designed to help high-income earners and employees with complex compensation structures (such as RSUs and Capital Gains) optimize their take-home pay and superannuation contributions.

## Overview

The Super Wealth Calculator provides a side-by-side comparative dashboard that visualizes the tax and wealth impacts of voluntary superannuation contributions. By automatically calculating complex tax liabilities, you can easily determine how much cash you need out-of-pocket and how much you're saving in taxes by utilizing your concessional contribution caps.

The project consists of two primary interfaces:
1. **The Advanced Dashboard (`index.html`)**: A single-page, real-time dashboard for quickly inputting complex financial data (Base Pay, RSUs, CGT) and instantly seeing the side-by-side comparison of up to 3 scenarios.
2. **The Super Wealth Wizard (`wizard.html`)**: A guided, step-by-step interactive questionnaire designed for a more accessible user experience, leading to the same comprehensive dashboard.

## Features

- **Progressive Tax Engine**: Fully up-to-date with ATO Stage 3 Tax Cuts (2024-25 / 2025-26).
- **RSU & Capital Gains Support**: Handles Restricted Stock Units and computes Capital Gains Tax (CGT) with automatic 50% discount eligibility calculations.
- **Div 293 Tax**: Automatically detects and calculates the extra 15% tax on concessional super contributions if your combined income exceeds the $250k threshold.
- **Medicare Levy & Surcharge**: Calculates standard Medicare Levy and dynamically assesses Medicare Levy Surcharge (MLS) tiers based on Private Health Insurance status.
- **Low Income Tax Offset (LITO)**: Automatically applies LITO for applicable income brackets.
- **Super Contribution Splitting**: Automatically prevents you from exceeding your concessional cap (default $30k + carry forward) and automatically categorizes excess as non-concessional (after-tax).
- **Ephemeral Session Encryption**: All financial data inputted is encrypted locally in your browser using the Web Crypto API (AES-GCM). Data is NEVER sent to any server. Upon closing the tab, the decryption keys are destroyed, ensuring complete privacy.

## Security & Privacy (APP Compliant)

This application is built with extreme privacy in mind, fully compliant with the Australian Privacy Principles (APP 2: Anonymity and Pseudonymity).
- **No Trackers**: Zero third-party scripts, analytics, or trackers.
- **Strict Content-Security-Policy (CSP)**: Enforced `default-src 'self'` to block any external requests.
- **Offline First**: Runs completely locally in your browser.
- **Native System Fonts**: Uses optimized native OS fonts to prevent external requests to services like Google Fonts.

## Usage

Simply open `index.html` or `wizard.html` in your browser. No server setup, database, or backend required.

## Disclaimer

*This tool is for informational and educational purposes only. It does not constitute financial, tax, or legal advice. Always consult with a registered tax agent or financial advisor before making decisions regarding your superannuation or tax strategy.*
