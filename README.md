# hostaway-kit

Read-only [MCP](https://modelcontextprotocol.io) server plus Cursor / Claude Code / Codex skills for operators who already run [Hostaway](https://www.hostaway.com) as their PMS.

Ask an assistant about listings, calendar, inbox, and simple reports. Hostaway stays the system of record. This kit never writes — no messages, no calendar blocks, no reservations.

Shipped by **[STYLABS](https://www.stylabs.com/work/hostaway)**, an AI-native venture studio that builds custom Hostaway booking sites and operator dashboards. STYLABS is not an official Hostaway partner.

## What you get

1. **Read-only MCP (stdio)** — `list_listings`, `get_listing`, `get_calendar`, `list_reservations`, `list_conversations`, `list_messages`, plus inbox triage, draft reply, and reports.
2. **Denylist** on every listing / reservation / message payload: `wifiPassword`, `wifiUsername`, `doorSecurityCode`, `doorCode`, `doorCodeVendor`, `doorCodeInstruction`, and all `invoicing*` contact fields.
3. **Inbox intelligence Hostaway does not compute** — unanswered / SLA triage and a suggested reply grounded in *that* listing's fields, house rules, and calendar. Rates come from the calendar or are reported as unknown. Nothing is sent.
4. **Reports Hostaway does not ship as owner statements** — occupancy and blocked holes from the calendar, unanswered thread counts, listing completeness (photos / house rules / amenities). No financials.
5. **Skills in this repo** (not on npm) that tell the model to use the MCP tools and never invent numbers.

Mapped to the [Hostaway Public API](https://api.hostaway.com/documentation):

| Kit behaviour | Hostaway |
| --- | --- |
| Active listings | `GET /v1/listings?specialStatus[]=active` |
| One listing | `GET /v1/listings/{id}?includeResources=1` |
| Calendar | `GET /v1/listings/{id}/calendar?includeResources=1` |
| Stay search on the list | `availabilityDateStart`, `availabilityDateEnd`, `availabilityGuestNumber` |
| Check-in / check-out | integers **0–23** (`checkInTimeStart`, `checkInTimeEnd`, `checkOutTime`) |
| Amenities | `amenityId` integers, not free-text names (`GET /v1/amenities` resolves names) |
| Inbox | `GET /v1/conversations`, `GET /v1/conversations/{id}/messages` |
| Create reservation / send message | **out** |

If `HOSTAWAY_ACCOUNT_ID` or `HOSTAWAY_CLIENT_SECRET` is unset, the server serves bundled fixtures so `npx` still demos.

## Install / run

```bash
npx -y hostaway-kit
```

Or from this repo:

```bash
npm install
npm run build
node dist/index.js
```

stdio only. Logs go to stderr. Credentials are optional.

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `HOSTAWAY_ACCOUNT_ID` | for live reads | Hostaway account id (`client_id` on `POST /v1/accessTokens`) |
| `HOSTAWAY_CLIENT_SECRET` | for live reads | Client secret from the Hostaway dashboard |
| `HOSTAWAY_KIT_NOW` | no | ISO timestamp that pins "now" for SLA math (used by tests) |

Get an API client secret from the Hostaway dashboard. This kit does not ship or use a Hostaway account.

## Cursor

Add to `~/.cursor/mcp.json` (or project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "hostaway": {
      "command": "npx",
      "args": ["-y", "hostaway-kit"],
      "env": {
        "HOSTAWAY_ACCOUNT_ID": "your-account-id",
        "HOSTAWAY_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Leave both env values empty, or omit `env`, to run the fixture demo.

Copy the skills from this repo into Cursor:

```bash
cp -R skills/* ~/.cursor/skills/
```

## Claude Code

Add to `~/.claude.json` (or project `.mcp.json`):

```json
{
  "mcpServers": {
    "hostaway": {
      "command": "npx",
      "args": ["-y", "hostaway-kit"],
      "env": {
        "HOSTAWAY_ACCOUNT_ID": "your-account-id",
        "HOSTAWAY_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Skills:

```bash
mkdir -p .claude/skills
cp -R skills/* .claude/skills/
```

## Codex

`~/.codex/config.toml`:

```toml
[mcp_servers.hostaway]
command = "npx"
args = ["-y", "hostaway-kit"]

[mcp_servers.hostaway.env]
HOSTAWAY_ACCOUNT_ID = "your-account-id"
HOSTAWAY_CLIENT_SECRET = "your-client-secret"
```

Skills live in this repository under `skills/`. Point Codex at that folder or copy the `SKILL.md` files into your Codex skills path.

## Skills (repo only)

| Skill | When to use |
| --- | --- |
| `skills/hostaway-pms` | Hostaway stays the PMS. Do not push their website builder. |
| `skills/hostaway-guest-answers` | Answer guests from that listing's fields only. |
| `skills/hostaway-availability` | Date-range availability from list filters + calendar. |
| `skills/hostaway-inbox` | SLA triage and draft. Never send. |
| `skills/hostaway-reporting` | Occupancy, holes, unanswered counts, completeness. |

The npm package is the MCP server only. Skills stay in git.

## Tools

| Tool | What it does |
| --- | --- |
| `list_listings` | Active listings; optional city / name / availability filters |
| `get_listing` | One listing, resources included, secrets stripped |
| `get_calendar` | Day rows with status, `isAvailable`, `price` (null = unknown) |
| `list_reservations` | Reservations; door codes stripped |
| `list_conversations` | Inbox threads |
| `list_messages` | Messages in a thread |
| `inbox_triage` | Unanswered + SLA (`breached` / `waiting` / `answered`) |
| `draft_reply` | Grounded draft. `send` is always `false`. |
| `report_occupancy` | Reserved / available / blocked + blocked holes |
| `report_inbox` | Unanswered thread counts |
| `report_completeness` | Missing photos, house rules, amenities |

Occupancy rate = reserved nights ÷ (reserved + available). Blocked nights are listed as holes, not folded into occupancy.

## Fixtures

Demo inventory (not a real Hostaway account):

- **101 Harbor View Studio** — complete listing. Raw fixture includes `wifiPassword` / invoicing contacts; the denylist strips them.
- **102 Riverside Loft** — no photos.
- **103 Pine Cabin** — no house rules, no amenities.
- **199** — archived; omitted unless `includeArchived` is true.
- August 2026 calendar on 101 with reserved nights, a two-night blocked hole (6–7 Aug), and 11 Aug with `price: null`.
- Unread threads 501 (SLA breach), 502 (within SLA), 504 (pets question on the incomplete listing). 503 is answered.

## Tests

```bash
npm test
```

Covers denylist, fixture filters, occupancy math, SLA counts, draft refusal of secrets and invented rates, and the absence of a send path.

## Out of scope

Writes of any kind. Guest Payments, Stripe, WordPress plugins, a hosted Claude connector, a Cursor marketplace plugin, Hostaway's website builder, Flagship guest websites, owner statements, or live client data.

## License

MIT. See [LICENSE](LICENSE).

Hostaway is a trademark of its owner. This project is not affiliated with or endorsed by Hostaway.
