# Membership structure audit: no level up may remove a benefit (directives 44 and 46)

## Finding
Couples could not keep the couples experience while adding In Business, CONNECT 360 or Executive Private:
- Pricing blocked the Couples upgrade on exclusive plans, so Executive Private + couples was impossible.
- Recommendations treated Couples Membership as the only couples plan, so a couple asking for In Business had no path
  (Dual Society would have removed the couples experience and lowered Journey from 250 to 225 messages a month).

## Corrections
| Starting point | Wants | Path now offered | Keeps |
|---|---|---|---|
| Couples Membership | In Business | Dual Society with the Couples upgrade | Couples experience, In Love, Journey ≥ 250 |
| Couples Membership | CONNECT 360 / Executive Private | Executive Private with the Couples upgrade | Couples experience, Journey 450 |
| Any couple | Everything | Elite Concierge (invitation-only; couples included) | Everything |
| Dual Society with the Couples upgrade | CONNECT 360 | Executive Private with the Couples upgrade | Everything |
| Any singles plan | Any feature | Lowest plan that keeps all current benefits | Everything |

- Pricing: the Couples upgrade combines with Executive Private (as with Dual Society); Elite Concierge includes couples.
- Journey: a couple's allowance is the higher of their plan's and Couples Membership's (`journey_effective_tier`).
- Recommendations include "plan with the Couples upgrade" options; checkout lists any loss and asks for confirmation.
- Test: from every starting point (free single, free couple, every plan, every plan with the Couples upgrade), every
  restricted feature has a level-up path that loses nothing. "No path" is not an accepted result.

## Awaiting the founder
- **Couples upgrade price.** No price is set (published or draft). Combinations that use it show "price awaiting approval"
  and cannot be checked out until the founder sets it. No price was invented.
