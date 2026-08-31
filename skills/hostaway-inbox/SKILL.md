---
name: hostaway-inbox
description: Inbox SLA triage and draft replies using inbox_triage and draft_reply. Hostaway's inbox does not compute this. Never send the draft.
---

# Inbox draft and SLA

Hostaway's inbox shows threads. It does not rank unanswered work by SLA or draft a reply from listing fields. Use hostaway-kit.

## Required tools

1. `inbox_triage` — unanswered threads. Default SLA is 2 hours. `status` is `breached`, `waiting`, or `answered`.
2. `list_messages` — read the thread before drafting.
3. `get_listing` and `get_calendar` when the guest asked about the stay.
4. `draft_reply` — suggested text grounded in that listing.

## SLA

- Unanswered means the latest message is incoming, or Hostaway `hasUnreadMessages` is set and there is no later host reply.
- `hoursWaiting` is computed from the last incoming timestamp. Do not invent wait times.
- Sort operator work by `breached` first, then longest `hoursWaiting`.

## Drafts

- The draft must stay inside listing fields, house rules, amenityId values, and calendar prices.
- If the guest asked for wifi or a door code, the draft must refuse. Those fields are denylisted. The operator copies them from Hostaway and sends them in Hostaway.
- If the guest asked for a rate and the calendar price is missing, the draft must say unknown. Do not invent a number.
- `draft_reply` always returns `send: false` and `sendEndpoint: null`. There is no send tool. Tell the operator to paste the draft into Hostaway if they want to send it.

## Never

- Never call `POST /v1/conversations/{id}/messages`.
- Never claim the message was sent.
