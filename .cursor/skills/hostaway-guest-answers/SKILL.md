---
name: hostaway-guest-answers
description: Answer guest questions from that Hostaway listing's fields only. Use get_listing and get_calendar. Never invent amenities, house rules, rates, or access codes.
---

# Answer from listing fields only

When an operator asks what to tell a guest, load **that** listing. Do not mix properties.

## Required tools

1. `get_listing` with the listing id.
2. `get_calendar` if the question is about a date, availability, or a nightly rate.
3. `draft_reply` when the question sits on a conversation.

## Grounding rules

- House rules come from `houseRules`. If it is empty, say house rules are not filled in. Do not invent a pet policy.
- Check-in and check-out are `checkInTimeStart`, `checkInTimeEnd`, and `checkOutTime`. Hostaway stores them as integers **0–23** in the listing's local timezone. Format as `HH:00`. Do not convert them as if they were minutes.
- Amenities on the listing are `{ id, amenityId }`. Never invent amenity names. `draft_reply` may attach names from `GET /v1/amenities`. If an amenityId is absent, the listing does not have it.
- Nightly rates come from the calendar `price` field. If `price` is null or the night is missing, the rate is **unknown**. Never invent a number.
- wifiPassword, wifiUsername, doorSecurityCode, doorCode, doorCodeVendor, doorCodeInstruction, and invoicing contact fields are stripped. If the guest asked for wifi or a door code, tell the operator to copy it from the Hostaway dashboard and send it in Hostaway's inbox. Do not guess.

## Never

- Never POST a message. There is no send tool.
- Never use another listing's rules to fill a gap.
