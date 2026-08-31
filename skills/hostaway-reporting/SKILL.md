---
name: hostaway-reporting
description: Operator reports Hostaway does not ship as owner statements — occupancy, blocked holes, unanswered threads, listing completeness. Compute from reads. Never invent numbers.
---

# Reporting from reads

These figures are computed from Hostaway GETs. They are not owner statements, payouts, or financials. Do not implement or mention `list_owner_statements`.

## Required tools

- `report_occupancy` — reserved / available / blocked nights and blocked holes from `get_calendar` data.
- `report_inbox` — unanswered and SLA-breached thread counts.
- `report_completeness` — missing photos, missing house rules, missing amenities.

You may cross-check with `get_calendar`, `list_conversations`, and `get_listing`. If the tool did not return a number, say you do not have it.

## Occupancy math

- Occupancy rate = reserved nights ÷ (reserved + available).
- Blocked and hardBlock nights are excluded from that denominator and listed as `blockedHoles` (consecutive blocked days).
- Do not turn this into revenue, ADR, or owner payout. Calendar `price` is a nightly rate when present, not a statement.

## Completeness

- Missing photos: `listingImages` is empty.
- Missing house rules: `houseRules` is null or blank.
- Missing amenities: `listingAmenities` is empty. Amenities are amenityId integers.

## Never

- Never invent occupancy percentages, hole lengths, or unread counts.
- Never produce financials (channel commission, Hostaway commission, owner statements, Stripe).
