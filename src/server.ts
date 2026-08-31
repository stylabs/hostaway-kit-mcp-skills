import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { draftReply, inboxTriage } from "./inbox.js";
import { FixtureStore } from "./fixtures.js";
import { LiveHostawayStore } from "./live.js";
import { reportCompleteness, reportInbox, reportOccupancy } from "./reporting.js";
import { credentialsConfigured, type HostawayStore } from "./store.js";

export const TOOL_NAMES = [
  "list_listings",
  "get_listing",
  "get_calendar",
  "list_reservations",
  "list_conversations",
  "list_messages",
  "inbox_triage",
  "draft_reply",
  "report_occupancy",
  "report_inbox",
  "report_completeness",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

const WRITE_TOOL_PATTERN = /send|create_|update_|delete_|post_|write_|block_/i;

export function hasWriteToolName(name: string): boolean {
  return WRITE_TOOL_PATTERN.test(name);
}

export function createStore(): HostawayStore {
  if (credentialsConfigured()) return new LiveHostawayStore();
  return new FixtureStore();
}

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

export function createHostawayServer(store: HostawayStore = createStore()): McpServer {
  const server = new McpServer({
    name: "hostaway-kit",
    version: "1.0.0",
  });

  server.tool(
    "list_listings",
    "List Hostaway listings. Defaults to GET /v1/listings?specialStatus[]=active. Optional availabilityDateStart/End + availabilityGuestNumber filter the list the same way Hostaway does. Amenities are amenityId values, not free-text names. Check-in/out hours are 0–23. Denylisted access and invoicing fields are stripped.",
    {
      city: z.string().optional(),
      match: z.string().optional().describe("Search by listing name"),
      includeArchived: z.boolean().optional().describe("If true, omit specialStatus[]=active"),
      availabilityDateStart: z.string().optional().describe("Y-m-d, passed to Hostaway listings list"),
      availabilityDateEnd: z.string().optional().describe("Y-m-d, exclusive departure for fixture stays"),
      availabilityGuestNumber: z.number().int().positive().optional(),
    },
    async (args) => {
      const listings = await store.listListings(args);
      return jsonResult({ meta: store.meta(), count: listings.length, listings });
    },
  );

  server.tool(
    "get_listing",
    "Retrieve one listing via GET /v1/listings/{id}?includeResources=1. House rules, check-in hours (0–23), amenityId values, and photos are included. wifiPassword, door codes, and invoicing contacts are stripped.",
    {
      listingId: z.number().int(),
    },
    async ({ listingId }) => {
      const listing = await store.getListing(listingId);
      if (!listing) return errorResult(`Listing ${listingId} was not found.`);
      return jsonResult({ meta: store.meta(), listing });
    },
  );

  server.tool(
    "get_calendar",
    "Retrieve listing calendar via GET /v1/listings/{id}/calendar?includeResources=1. Each day has status (available/blocked/reserved/pending), isAvailable, and price (null means unknown — do not invent a rate). Nested reservations are denylist-stripped.",
    {
      listingId: z.number().int(),
      startDate: z.string().describe("Y-m-d"),
      endDate: z.string().describe("Y-m-d"),
    },
    async ({ listingId, startDate, endDate }) => {
      const days = await store.getCalendar(listingId, startDate, endDate);
      return jsonResult({ meta: store.meta(), listingId, startDate, endDate, days });
    },
  );

  server.tool(
    "list_reservations",
    "List reservations via GET /v1/reservations. Read-only. doorCode / doorCodeVendor / doorCodeInstruction are stripped. Create reservation is not implemented.",
    {
      listingId: z.number().int().optional(),
      arrivalStartDate: z.string().optional(),
      arrivalEndDate: z.string().optional(),
      match: z.string().optional().describe("Guest name search"),
    },
    async (args) => {
      const reservations = await store.listReservations(args);
      return jsonResult({ meta: store.meta(), count: reservations.length, reservations });
    },
  );

  server.tool(
    "list_conversations",
    "List inbox threads via GET /v1/conversations?includeResources=1. Nested Reservation objects are denylist-stripped.",
    {
      reservationId: z.number().int().optional(),
      listingId: z.number().int().optional(),
    },
    async (args) => {
      const conversations = await store.listConversations(args);
      return jsonResult({ meta: store.meta(), count: conversations.length, conversations });
    },
  );

  server.tool(
    "list_messages",
    "List messages in a thread via GET /v1/conversations/{id}/messages. Read-only. There is no send tool.",
    {
      conversationId: z.number().int(),
    },
    async ({ conversationId }) => {
      const messages = await store.listMessages(conversationId);
      return jsonResult({ meta: store.meta(), conversationId, count: messages.length, messages });
    },
  );

  server.tool(
    "inbox_triage",
    "Unanswered / SLA view Hostaway's inbox does not compute. A thread is unanswered when the latest message is incoming (or hasUnreadMessages with no later host reply). Default SLA is 2 hours. Does not send replies.",
    {
      slaHours: z.number().positive().optional(),
      listingId: z.number().int().optional(),
    },
    async (args) => jsonResult(await inboxTriage(store, args)),
  );

  server.tool(
    "draft_reply",
    "Suggested reply grounded in THAT listing's fields, house rules, amenityId values, and calendar prices. Never invent rates (use calendar or say unknown). Never include wifi or door codes. Never POSTs a message — send is always false and there is no send endpoint.",
    {
      conversationId: z.number().int(),
      question: z
        .string()
        .optional()
        .describe("Optional focus question; defaults to the latest incoming message"),
    },
    async ({ conversationId, question }) => {
      try {
        return jsonResult(await draftReply(store, conversationId, question));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.tool(
    "report_occupancy",
    "Occupancy and blocked holes computed from calendar reads. Occupancy = reserved nights / (reserved + available). Blocked holes are consecutive blocked/hardBlock days. Not an owner statement. No financials.",
    {
      startDate: z.string(),
      endDate: z.string(),
      listingId: z.number().int().optional(),
    },
    async ({ startDate, endDate, listingId }) =>
      jsonResult(await reportOccupancy(store, startDate, endDate, listingId)),
  );

  server.tool(
    "report_inbox",
    "Unanswered thread counts by listing, computed from conversation reads. Not a Hostaway owner statement.",
    {
      slaHours: z.number().positive().optional(),
      listingId: z.number().int().optional(),
    },
    async (args) => jsonResult(await reportInbox(store, args)),
  );

  server.tool(
    "report_completeness",
    "Listing completeness from reads: missing photos, missing house rules, missing amenities (empty listingAmenities). Not a financial report.",
    {
      listingId: z.number().int().optional(),
    },
    async ({ listingId }) => jsonResult(await reportCompleteness(store, listingId)),
  );

  return server;
}

export async function startStdioServer(): Promise<void> {
  const store = createStore();
  const server = createHostawayServer(store);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const mode = store.meta().source;
  console.error(`hostaway-kit MCP ready (${mode}). Tools: ${TOOL_NAMES.join(", ")}. No send endpoint.`);
}
