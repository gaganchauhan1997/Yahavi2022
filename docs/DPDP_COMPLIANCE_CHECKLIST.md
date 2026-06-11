# DPDP Act 2023 Compliance Checklist for HackKnow

**Applicable Law**: Digital Personal Data Protection Act, 2023 (India)
**Data Fiduciary**: HackKnow (gaganchauhan1997 / team@hackknow.com)
**Last Reviewed**: June 2026 (as part of full repo audit)
**Status**: Partial Compliance — Strong technical foundations, documentation & consent gaps to close.

> This checklist is actionable. Items marked **Action Needed** should be prioritized before scaling user base or processing sensitive data at volume.

## 1. Data Processing Principles (Section 4-8 DPDP)

| # | Principle | Current Status | Evidence / Location | Action Needed |
|---|-----------|----------------|---------------------|---------------|
| 1 | **Lawful Purpose** | Partial | Products, orders, auth, downloads, AI chat | Document specific purposes in Privacy Policy |
| 2 | **Purpose Limitation** | Partial | 30-day download expiry is good example | Ensure AI chat prompts are not used for unrelated training |
| 3 | **Data Minimisation** | Good | Only necessary fields collected (name, email, phone?, address for orders) | Review Google OAuth scopes (minimal) |
| 4 | **Accuracy** | Good | User can update profile | Add easy "Download my data" + "Delete my account" flows |
| 5 | **Storage Limitation** | Partial | 30-day download access enforced | Define retention periods for chat logs, order history, Google auth tokens |
| 6 | **Security** | Excellent | Edge proxy, hidden backend, cookie sanitization, dompurify, env-var secrets | Formalise security incident response plan |

## 2. Consent Management (Critical for DPDP)

| Requirement | Status | Current Implementation | Recommendation |
|-------------|--------|------------------------|----------------|
| Explicit consent for collection | **Action Needed** | Implicit via account creation / Google Sign-In | Add clear consent checkbox + link to Privacy Policy at signup & checkout |
| Separate consent for marketing | **Action Needed** | Newsletter signup exists | Make it opt-in with granular consent (email, WhatsApp, etc.) |
| Consent for AI chat processing | **Action Needed** | Chat works without explicit notice | Add small notice: "Your chat may be processed by our AI assistant" + option to disable |
| Withdrawal of consent | Partial | User can delete account? | Implement one-click "Delete my data" that triggers WP + edge cleanup |
| Record of consent | **Action Needed** | Not currently logged | Log consent timestamp + version of policy in user meta or order meta |

## 3. Rights of Data Principal (Chapter III)

| Right | Status | Implementation Notes | Action |
|-------|--------|----------------------|--------|
| Right to access (copy of data) | **Action Needed** | No self-serve portal | Add "Download my data" button in User Profile → generates JSON export |
| Right to correction | Good | Profile edit exists | Ensure address/phone updates propagate correctly |
| Right to erasure | **Action Needed** | No automated flow | Build "Delete Account & Data" flow (anonymize orders or hard delete after retention) |
| Right to data portability | **Action Needed** | - | Same as access right (JSON/CSV export) |
| Right to withdraw consent | **Action Needed** | - | Link from profile + email support |

## 4. Children & Sensitive Data

| Area | Status | Notes |
|------|--------|-------|
| Processing children's data | **Review Needed** | Digital products marketplace — assume adult creators. Add age gate or declaration if targeting younger users |
| Sensitive personal data | Low risk | No health, biometric, or financial data beyond payment gateway (Razorpay handles PCI) |

## 5. Cross-Border Transfer & Third Parties

| Party | Purpose | Status | Action |
|-------|---------|--------|--------|
| Google (OAuth) | Authentication | Standard | Ensure Google consent screen + privacy policy link is correct |
| Razorpay | Payments | Good | Razorpay is RBI-regulated. Verify their DPA / data processing agreement |
| Cloudflare | Edge hosting + Workers AI | Good | Cloudflare DPA available. Data residency options if needed |
| Hostinger | WordPress hosting | Review | Confirm data processing terms in Hostinger ToS |

## 6. Privacy Policy & Transparency (Section 5)

**Current Gap**: No dedicated, prominent Privacy Policy or Terms of Service linked in footer / signup.

**Recommended Actions**:
1. Create `/privacy` and `/terms` routes/pages (React)
2. Link them in:
   - Footer (every page)
   - Signup / Login modal
   - Checkout flow
   - AI chat input area
3. Policy must cover:
   - What data is collected (Google profile, order history, download activity, chat prompts)
   - Purpose of each processing activity
   - Retention periods
   - Third-party sharing (Razorpay, Cloudflare, Google)
   - User rights + how to exercise them
   - Contact for grievances (Data Protection Officer or designated person)

## 7. Payment & Financial Data (RBI + DPDP overlap)

- Razorpay client-side integration is correct.
- **Critical**: Server-side signature verification + amount validation **must** be confirmed in `hackknow-checkout.php` or webhook handler.
- Do **not** store full card details (Razorpay handles this).
- Store only necessary transaction reference + status.

**Action**: Add a short note in codebase or `docs/` confirming "Payment verification implemented on [date]".

## 8. AI / Automated Processing

Yahavi Chat uses Cloudflare Workers AI.

**Recommendations**:
- Do not use chat history for model training without explicit consent.
- Log only necessary metadata (not full prompts if possible).
- Provide option for users to opt out of AI chat (fallback to support ticket).

## 9. Breach Notification

**Action Needed**: Document internal process for detecting, containing, and notifying Data Protection Board + affected users within 72 hours (as per DPDP).

## 10. Quick Wins (Prioritize These)

1. Add Privacy Policy + Terms links in footer and auth flows (1-2 hours)
2. Add consent language at Google Sign-In and checkout (30 mins)
3. Implement basic "Download my data" JSON export in profile page (half day)
4. Confirm server-side Razorpay verification is live
5. Add small AI chat processing notice

## Summary Status

- **Technical Security**: Excellent
- **Consent & Transparency**: Needs immediate work
- **User Rights Implementation**: Partial
- **Documentation**: This checklist + new Privacy Policy draft will close most gaps

---

**Next Step Recommendation**: Create `src/pages/PrivacyPolicy.tsx` and `src/pages/TermsOfService.tsx` using existing shadcn components, then link them everywhere.

*Generated as part of June 2026 full repository audit by Grok.*
