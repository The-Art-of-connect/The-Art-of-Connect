---
title: Security and Responsible Vulnerability Disclosure Policy
version: 2026-12-draft-1
consent: security_disclosure
category: privacy
summary: How The Art of Connect protects the platform and how security researchers can report vulnerabilities responsibly.
---
*Draft pending owner approval and attorney review — not yet in effect.*

**The Art of Connect, LLC** ("we," "us") takes the security of our members' information seriously. This policy describes our security practices in general terms and explains how to report a potential vulnerability.

## 1. Our security practices
We describe these practices so members understand how their information is protected. They are not a guarantee, and no system is perfectly secure.
- **Separation of member data:** our database enforces row-level security so that members can read only their own private records. Private journals, assessments and confidential communications are not visible to staff, including the owner.
- **Encryption in transit:** the website and our service providers use HTTPS.
- **Staff access:** staff permissions are assigned by role, and every staff account must use two-factor authentication before accessing the Owner Portal.
- **Audit trails:** administrative and financial changes are recorded, including who made a change and when. Financial records cannot be altered after they are written.
- **Bot protection and rate limiting:** sign-in, registration, password recovery and public forms are protected by Cloudflare Turnstile and per-visitor rate limits.
- **Payments:** card details are handled by Stripe and never stored by us.
- **Identity documents:** handled by Stripe Identity and never stored by us.
- **Security logs:** record hashed IP addresses rather than raw addresses and never contain passwords or private content.
- **Automated checks:** code changes are checked for exposed secrets and known dependency vulnerabilities, and database permission tests run before release.

We do not claim any security certification (such as SOC 2 or ISO 27001). **[OWNER DECISION REQUIRED: whether to pursue a formal certification or third-party penetration test before launch]**

## 2. Reporting a vulnerability
If you believe you have found a security vulnerability in theartofconnect.com or our services, please email **info@theartofconnect.com** with the subject line "Security report." **[OWNER DECISION REQUIRED: dedicated security reporting address, e.g. security@theartofconnect.com]**

Please include:
- a description of the issue and where it occurs;
- steps to reproduce it;
- the potential impact; and
- how we can contact you.

Please do not include other people's personal information in your report.

## 3. What we ask of researchers
To protect our members, please:
1. Test only with accounts you own or have explicit permission to use.
2. Do not access, modify, download or delete other members' data. If you encounter it accidentally, stop, do not keep it, and tell us.
3. Do not read or attempt to read private journals, assessments or messages.
4. Do not perform denial-of-service attacks, spam, social engineering or physical attacks.
5. Do not use automated scanning that degrades the service for others.
6. Give us reasonable time to fix the issue before sharing it publicly. **[OWNER DECISION REQUIRED: disclosure timeline, e.g. 90 days]**

## 4. Out of scope
- Third-party services we use (Supabase, Netlify, Stripe, Resend, Cloudflare) — report issues in their systems directly to them.
- Reports that only describe best-practice suggestions without a demonstrable security impact.
- Issues requiring physical access to a user's device.

## 5. Our commitments
When you report in good faith under this policy, we will:
- acknowledge your report within **[OWNER DECISION REQUIRED: response time]**;
- keep you informed as we investigate and fix the issue; and
- credit you publicly if you wish, once the issue is resolved.

## 6. Safe harbor
**[ATTORNEY REVIEW: good-faith safe harbor language — e.g. that we will not pursue legal action against researchers who comply with this policy — and its interaction with computer misuse laws]**

## 7. Rewards
We do not currently offer a bug bounty or payment for reports. **[OWNER DECISION REQUIRED: whether to offer rewards]**

## 8. Security incidents affecting members
If a security incident affects your personal information, we will investigate promptly, take steps to contain it, and notify affected members and regulators as required by law. **[ATTORNEY REVIEW: state breach-notification timelines and content requirements]**

## 9. Protecting your own account
You play an important part in keeping your account secure:
- Use a unique password of at least 12 characters that you do not use on any other website.
- Never share your password or a sign-in link with anyone, including someone you met on the platform.
- We will never ask for your password by email, phone or message.
- Be cautious of messages that pressure you to act quickly, click unfamiliar links or move a conversation off the platform.
- Sign out on shared devices.

## 10. Scope
This policy covers theartofconnect.com, our member dashboard, the professional portal, the Owner Portal and our account and payment flows. **[OWNER DECISION REQUIRED: whether staging or preview environments are in scope]**

## 11. Reporting account security concerns
If you think your own account has been compromised, change your password immediately and email **info@theartofconnect.com**. Our team can sign your account out of every device.

## 12. Phishing and impersonation of The Art of Connect
Our emails come only from our verified theartofconnect.com domain and never ask for your password, payment card details or identity documents by reply. If you receive a message claiming to be from The Art of Connect that asks for these, do not respond; forward it to info@theartofconnect.com so we can investigate and warn other members.

## 13. Changes
We may update this policy as our security program grows. The version and effective date appear at the top.

## 14. Contact
**info@theartofconnect.com**
