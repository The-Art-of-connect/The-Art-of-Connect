# CONNECT 360 Intelligence Division: integration verification (testing)

_Recorded by Peace on November 28, 2026, from the stored self-test results (`public.intel_security_runs`, run `dd8c093a-85b7-40e2-96ad-1b78b3a6072d`) and the cost ledger (`public.intel_jobs`). The owner ran the test in Owner Portal → Intelligence Division._

**Result: 14 of 14 tests passed. No failures.**

- **Run time:** November 28, 2026, 02:11:50–02:11:53 UTC (November 27, 9:11 PM Eastern).
- **Recorded research spend:** $0.02, from two 1¢ jobs.
- **Mode:** testing only (owner, staff and test accounts).
- **Limits:** $25 per month and $5 per day.

| # | Test | Result | Evidence |
|---|---|---|---|
| I01 | All four provider settings present and correctly formatted | Pass | Parallel key, Parallel webhook secret, Exa key and Exa webhook secret all configured |
| I02 | Parallel accepts the API key | Pass | Free lookup of a non-existent run returned HTTP 404 (key accepted; nothing billed) |
| I03 | Exa accepts the API key | Pass | Free webhook listing returned HTTP 200 |
| I04 | Exa webhook registered for this site | Pass | `https://theartofconnect.netlify.app/api/intel/webhooks/exa` active for `webset.item.created`, `webset.search.completed`, `webset.item.enriched` and `webset.idle` |
| I05 | Exa receiver accepts a correctly signed delivery | Pass | HTTP 200 |
| I06 | Exa receiver refuses unsigned, altered and stale deliveries | Pass | HTTP 401 for each of the three |
| I07 | Parallel receiver accepts a correctly signed delivery | Pass | HTTP 200 |
| I08 | Parallel receiver refuses unsigned and altered deliveries | Pass | HTTP 401 for both |
| I09 | Repeated deliveries are recorded once | Pass | Each sent twice; one record per provider (test rows removed afterwards) |
| I10 | Testing-only mode and approved limits in force | Pass | Testing only on; $25.00 per month; $5.00 per day |
| I11 | Spending guard refuses an over-limit request | Pass | `refused:assignment_limit` |
| I12 | Parallel live search (fictional, public topic) | Pass | 3 cited sources, including official sba.gov pages; ledger: 1¢, succeeded |
| I13 | Exa live search (fictional, public topic) | Pass | 3 cited sources, including official sba.gov pages; ledger: 1¢, succeeded |
| I14 | Spend recorded and within budget | Pass | $0.02 this month |

**Test topic:** U.S. Small Business Administration 7(a) loan program eligibility requirements. This is public information with no personal or member data.

## Still to verify before production approval (owner direction, November 28, 2026)
1. **Webhook deliveries that come from the providers themselves.**
   - Parallel: a Task API run that reports completion to our receiver.
   - Exa: a small Webset whose events reach our receiver.

   The self-test signed its own test deliveries.
2. **Advanced research capabilities:** Parallel Task API (deep research with per-field citations), FindAll, and Exa Websets.
3. **Monitoring workflows:** Parallel Monitor and Exa Monitors for the Elite watchlist, at the minimum allowed frequency.
4. **Member-level permissions** using real role-play accounts:
   - only Executive and Elite members can commission research;
   - only Elite members get the watchlist;
   - every member sees only their own research.
5. **Spending enforcement under simultaneous requests:** concurrent calls must never exceed the daily, monthly, per-assignment or per-member limits.

Production services, production document storage, public enrollment and live payments remain disabled pending the owner's explicit authorization.
