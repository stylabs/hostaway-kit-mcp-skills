---
name: hostaway-availability
description: Check listing availability for a date range using Hostaway list filters and calendar days. Never invent open nights or rates.
---

# Check availability for a date range

Availability is a Hostaway read, not a guess.

## Required tools

1. `list_listings` with `availabilityDateStart`, `availabilityDateEnd`, and optional `availabilityGuestNumber`. This maps to Hostaway `GET /v1/listings` query parameters.
2. `get_calendar` with `includeResources` semantics already applied by the server (`includeResources=1`) for the listing you care about.

## How to read the calendar

- `status=available` and `isAvailable=1` means the night can be sold.
- `status=reserved` is occupied by a reservation.
- `status=blocked` or `hardBlock` is an owner/ops block, not a stay.
- Stay nights are `[arrival, departure)` — the departure date is not a paid night.

## Rates

Quote `price` from that calendar day only. If `price` is null, say **unknown**. Never invent a nightly rate, a weekly total, or a cleaning fee that the tool did not return.

## Guests

`availabilityGuestNumber` is listing person capacity on the Hostaway listings list. If the guest count exceeds `personCapacity` on `get_listing`, the listing does not fit.

## Never

- Never create a reservation. Create reservation is out of scope.
- Never block or unblock the calendar.
