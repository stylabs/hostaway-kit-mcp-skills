import { collectSecretValues, containsDeniedField } from "./denylist.js";
import { formatHour, hoursBetween, now, parseHostawayDateTime } from "./clock.js";
import { RAW_LISTINGS } from "./fixtures.js";
import type { HostawayStore } from "./store.js";
import type { CalendarDay, Conversation, ConversationMessage, Listing } from "./types.js";

export const DEFAULT_SLA_HOURS = 2;

export type ThreadStatus = "breached" | "waiting" | "answered";

export type TriageRow = {
  conversationId: number;
  listingId: number;
  listingName: string | null;
  guestName: string | null;
  lastIncomingAt: string | null;
  lastOutgoingAt: string | null;
  hoursWaiting: number | null;
  slaHours: number;
  unanswered: boolean;
  status: ThreadStatus;
  lastIncomingPreview: string | null;
};

export type DraftResult = {
  conversationId: number;
  listingId: number;
  listingName: string;
  sla: {
    unanswered: boolean;
    hoursWaiting: number | null;
    slaHours: number;
    status: ThreadStatus;
  };
  grounds: {
    houseRules: string | null;
    checkIn: { startHour: number | null; endHour: number | null; start: string | null; end: string | null };
    checkOut: { hour: number | null; formatted: string | null };
    personCapacity: number;
    amenities: { amenityId: number; name: string | null }[];
    calendarNights: { date: string; status: string; price: number | null | "unknown" }[];
  };
  suggestedReply: string;
  refusals: string[];
  send: false;
  sendEndpoint: null;
  note: string;
};

export async function inboxTriage(
  store: HostawayStore,
  options: { slaHours?: number; listingId?: number } = {},
): Promise<{ meta: ReturnType<HostawayStore["meta"]>; slaHours: number; threads: TriageRow[] }> {
  const slaHours = options.slaHours ?? DEFAULT_SLA_HOURS;
  const [conversations, listings] = await Promise.all([
    store.listConversations({ listingId: options.listingId }),
    store.listListings({ includeArchived: true }),
  ]);
  const listingName = new Map(listings.map((l) => [l.id, l.name]));
  const threads = conversations.map((conversation) =>
    classifyThread(conversation, slaHours, listingName.get(conversation.listingMapId) ?? null),
  );
  threads.sort((a, b) => (b.hoursWaiting ?? -1) - (a.hoursWaiting ?? -1));
  return { meta: store.meta(), slaHours, threads };
}

export async function draftReply(
  store: HostawayStore,
  conversationId: number,
  question?: string,
): Promise<DraftResult> {
  const conversation = await store.getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} was not found.`);
  }

  const listing = await store.getListing(conversation.listingMapId);
  if (!listing) {
    throw new Error(`Listing ${conversation.listingMapId} was not found.`);
  }

  if (containsDeniedField(listing) || containsDeniedField(conversation)) {
    throw new Error("Refusing to draft: a denylisted field leaked into the payload.");
  }

  const messages = await store.listMessages(conversationId);
  const lastIncoming = [...messages].reverse().find((m) => m.isIncoming === 1);
  const focus = (question ?? lastIncoming?.body ?? "").trim();

  const amenities = await store.listAmenities();
  const amenityName = new Map(amenities.map((a) => [a.id, a.name]));

  const dateHints = extractIsoDates(focus);
  let calendar: CalendarDay[] = [];
  if (dateHints.length > 0) {
    const start = dateHints[0];
    const end = dateHints[dateHints.length - 1];
    calendar = await store.getCalendar(listing.id, start, end);
  }

  const secrets = collectSecretValues(RAW_LISTINGS.find((l) => l.id === listing.id) ?? listing);
  const slaHours = DEFAULT_SLA_HOURS;
  const triage = classifyThread(conversation, slaHours, listing.name);

  const resolvedAmenities = listing.listingAmenities.map((a) => ({
    amenityId: a.amenityId,
    name: amenityName.get(a.amenityId) ?? null,
  }));

  const calendarNights = calendar.map((d) => ({
    date: d.date,
    status: d.status,
    price: d.price === null || d.price === undefined ? ("unknown" as const) : d.price,
  }));

  const { suggestedReply, refusals } = composeDraft({
    listing,
    focus,
    amenityName,
    calendar,
    conversation,
  });

  for (const secret of secrets) {
    if (suggestedReply.includes(secret)) {
      throw new Error("Draft contained a denylisted secret and was discarded.");
    }
  }

  return {
    conversationId,
    listingId: listing.id,
    listingName: listing.name,
    sla: {
      unanswered: triage.unanswered,
      hoursWaiting: triage.hoursWaiting,
      slaHours,
      status: triage.status,
    },
    grounds: {
      houseRules: emptyToNull(listing.houseRules),
      checkIn: {
        startHour: listing.checkInTimeStart,
        endHour: listing.checkInTimeEnd,
        start: formatHour(listing.checkInTimeStart),
        end: formatHour(listing.checkInTimeEnd),
      },
      checkOut: {
        hour: listing.checkOutTime,
        formatted: formatHour(listing.checkOutTime),
      },
      personCapacity: listing.personCapacity,
      amenities: resolvedAmenities,
      calendarNights,
    },
    suggestedReply,
    refusals,
    send: false,
    sendEndpoint: null,
    note: "Draft only. hostaway-kit has no send endpoint. Paste into the Hostaway inbox yourself if you want to send it.",
  };
}

function classifyThread(
  conversation: Conversation,
  slaHours: number,
  listingName: string | null,
): TriageRow {
  const messages = conversation.conversationMessages ?? [];
  const last = lastByDate(messages);
  const lastIncoming = lastByDate(messages.filter((m) => m.isIncoming === 1));
  const lastOutgoing = lastByDate(messages.filter((m) => m.isIncoming === 0));
  const unanswered = isUnanswered(conversation, last);
  const lastIncomingAt = lastIncoming?.date ?? conversation.messageReceivedOn;
  let hoursWaiting: number | null = null;
  if (unanswered && lastIncomingAt) {
    hoursWaiting = round1(hoursBetween(now(), parseHostawayDateTime(lastIncomingAt)));
  }
  let status: ThreadStatus = "answered";
  if (unanswered) {
    status = hoursWaiting !== null && hoursWaiting >= slaHours ? "breached" : "waiting";
  }
  return {
    conversationId: conversation.id,
    listingId: conversation.listingMapId,
    listingName,
    guestName: conversation.recipientName,
    lastIncomingAt,
    lastOutgoingAt: lastOutgoing?.date ?? conversation.messageSentOn,
    hoursWaiting,
    slaHours,
    unanswered,
    status,
    lastIncomingPreview: lastIncoming ? clip(lastIncoming.body, 160) : null,
  };
}

function isUnanswered(conversation: Conversation, last: ConversationMessage | undefined): boolean {
  if (last) return last.isIncoming === 1;
  if (conversation.hasUnreadMessages === 1) return true;
  if (conversation.messageReceivedOn && conversation.messageSentOn) {
    return conversation.messageReceivedOn > conversation.messageSentOn;
  }
  return Boolean(conversation.messageReceivedOn && !conversation.messageSentOn);
}

function lastByDate(messages: ConversationMessage[]): ConversationMessage | undefined {
  if (messages.length === 0) return undefined;
  return [...messages].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

function composeDraft(input: {
  listing: Listing;
  focus: string;
  amenityName: Map<number, string>;
  calendar: CalendarDay[];
  conversation: Conversation;
}): { suggestedReply: string; refusals: string[] } {
  const { listing, focus, amenityName, calendar, conversation } = input;
  const refusals: string[] = [];
  const paragraphs: string[] = [];
  const lower = focus.toLowerCase();
  const guest = conversation.recipientName ? conversation.recipientName.split(" ")[0] : "there";

  paragraphs.push(`Hi ${guest},`);

  if (asksAccessSecret(lower)) {
    refusals.push(
      "Wifi username/password, door codes, and door-code instructions are denylisted. Do not invent them and do not send them from this assistant. Copy them from the Hostaway listing in the dashboard if the guest needs them.",
    );
    paragraphs.push(
      "I can confirm listing details from Hostaway, but I will not send wifi or door codes from this assistant. I will share access details from the Hostaway inbox after I copy them from the listing there.",
    );
  }

  if (asksCheckIn(lower)) {
    const start = formatHour(listing.checkInTimeStart);
    const end = formatHour(listing.checkInTimeEnd);
    if (start && end) {
      paragraphs.push(`Check-in at ${listing.name} is ${start}–${end} (listing local time; hours are 0–23 in Hostaway).`);
    } else if (start) {
      paragraphs.push(`Check-in at ${listing.name} starts at ${start} (listing local time).`);
    } else {
      paragraphs.push(`Check-in hours are not set on this Hostaway listing.`);
    }
  }

  if (asksCheckOut(lower)) {
    const out = formatHour(listing.checkOutTime);
    if (out) {
      paragraphs.push(`Check-out is ${out} (listing local time).`);
    } else {
      paragraphs.push(`Check-out time is not set on this Hostaway listing.`);
    }
  }

  if (asksRate(lower)) {
    const dates = extractIsoDates(focus);
    if (dates.length === 0) {
      refusals.push("No calendar date was found in the question. Do not invent a nightly rate.");
      paragraphs.push(
        "I do not have a date to look up on the Hostaway calendar, so I cannot quote a rate. The calendar price for a specific night is the only figure I will use.",
      );
    } else {
      for (const date of dates) {
        const night = calendar.find((d) => d.date === date);
        if (!night) {
          refusals.push(`No calendar row for ${date}. Rate unknown — do not invent one.`);
          paragraphs.push(
            `I do not have a Hostaway calendar price for ${date}, so that night's rate is unknown.`,
          );
        } else if (night.price === null || night.price === undefined) {
          refusals.push(`Calendar price for ${date} is null. Rate unknown — do not invent one.`);
          paragraphs.push(
            `The Hostaway calendar has ${night.status} on ${date} but no price, so the rate is unknown.`,
          );
        } else {
          paragraphs.push(
            `The Hostaway calendar lists ${listing.currencyCode} ${night.price} for ${date} (${night.status}).`,
          );
        }
      }
    }
  }

  if (asksPets(lower) || asksHouseRules(lower)) {
    const rules = emptyToNull(listing.houseRules);
    if (!rules) {
      paragraphs.push(
        `House rules are not filled in on this Hostaway listing, so I will not invent a pet or house-rule policy.`,
      );
    } else {
      paragraphs.push(`House rules on this listing: ${rules}`);
    }
  }

  if (asksAmenity(lower)) {
    const named = listing.listingAmenities
      .map((a) => amenityName.get(a.amenityId))
      .filter((n): n is string => Boolean(n));
    if (listing.listingAmenities.length === 0) {
      paragraphs.push(
        "This listing has no amenities recorded in Hostaway (listingAmenities is empty). I will not invent amenity names.",
      );
    } else {
      const ids = listing.listingAmenities.map((a) => a.amenityId).join(", ");
      paragraphs.push(
        `Amenities on this listing are stored as amenityId values (${ids})${named.length ? `: ${named.join(", ")}` : ""}. Those names come from GET /v1/amenities, not free text on the listing.`,
      );
    }
  }

  if (paragraphs.length === 2 && !asksAccessSecret(lower)) {
    const rules = emptyToNull(listing.houseRules);
    paragraphs.push(
      rules
        ? `I can only answer from this listing's Hostaway fields. House rules: ${rules}`
        : `I can only answer from this listing's Hostaway fields. House rules are not set.`,
    );
  }

  paragraphs.push("Best regards");

  return { suggestedReply: paragraphs.join("\n\n"), refusals };
}

function asksAccessSecret(lower: string): boolean {
  return /wifi|wi-fi|password|door ?code|lockbox|entry code|access code/.test(lower);
}

function asksCheckIn(lower: string): boolean {
  return /check[- ]?in/.test(lower);
}

function asksCheckOut(lower: string): boolean {
  return /check[- ]?out/.test(lower);
}

function asksRate(lower: string): boolean {
  return /how much|price|rate|cost|nightly|extra night/.test(lower);
}

function asksPets(lower: string): boolean {
  return /pet|dog|cat/.test(lower);
}

function asksHouseRules(lower: string): boolean {
  return /house ?rules|quiet hours|smoking|parties/.test(lower);
}

function asksAmenity(lower: string): boolean {
  return /washer|dryer|kitchen|amenit|wifi|internet|tv/.test(lower);
}

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function extractIsoDates(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
    found.add(match[0]);
  }
  for (const match of text.matchAll(
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?\b/gi,
  )) {
    const monthName = match[0].split(/\s+/)[0].toLowerCase();
    const monthKey = Object.keys(MONTHS).find((m) => monthName.startsWith(m.slice(0, 3)));
    if (!monthKey) continue;
    const day = String(Number(match[1])).padStart(2, "0");
    const year = match[2] ?? "2026";
    found.add(`${year}-${MONTHS[monthKey]}-${day}`);
  }
  return [...found].sort();
}

function emptyToNull(value: string | null | undefined): string | null {
  if (!value || value.trim().length === 0) return null;
  return value;
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
