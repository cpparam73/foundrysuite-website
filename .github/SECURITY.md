# Security Policy

## Supported surface

This repository hosts the FoundrySuite marketing website (static HTML/CSS/JS).

Security guidance for server/CDN headers lives in [`docs/SECURITY.md`](../docs/SECURITY.md).

## Reporting a vulnerability

Please email **parameswaran.cp@foundrysuite.com** with:

- A short description of the issue
- Steps to reproduce
- Impact assessment (if known)
- Any suggested fix

Do **not** open a public GitHub issue for security vulnerabilities.

We aim to acknowledge reports within **5 business days**.

## Scope

In scope:

- XSS / injection via site scripts or forms
- Clickjacking / framing issues
- Sensitive data exposure in this repository
- Broken authentication or session handling if introduced later

Out of scope:

- Denial-of-service against third-party services (e.g. Formspree)
- Issues that require physical access or compromised user devices
- Social engineering of FoundrySuite staff or customers
