import { stripSecrets } from "./denylist.js";
import { fixtureModeNote, type HostawayStore } from "./store.js";
import type {
  Amenity,
  CalendarDay,
  Conversation,
  ConversationMessage,
  ConversationQuery,
  Listing,
  ListingQuery,
  Reservation,
  ReservationQuery,
} from "./types.js";

/**
 * Deterministic demo account. No live Hostaway properties.
 * Listing 101 carries wifiPassword / invoicing contacts that the denylist must strip.
 * Listing 102 has no photos. Listing 103 has no house rules and no amenities.
 * Listing 199 is archived and excluded by specialStatus[]=active.
 */

export const AMENITIES: Amenity[] = [
  { id: 1, name: "Cable TV" },
  { id: 2, name: "Internet" },
  { id: 3, name: "Wireless Internet" },
  { id: 8, name: "Kitchen" },
  { id: 16, name: "Washer" },
];

export const RAW_LISTINGS: Listing[] = [
  {
    id: 101,
    name: "Harbor View Studio",
    externalListingName: "Harbor View Studio",
    internalListingName: "HVS-101",
    description:
      "A one-bedroom studio two blocks from the ferry. Kitchenette, desk, and a small balcony.",
    houseRules:
      "No parties. Quiet hours 22:00–08:00. No smoking indoors. Pets are not allowed. Maximum 4 guests.",
    keyPickup: "Lockbox on the stair rail — code is stored in Hostaway, not in this kit.",
    specialInstruction: "Street parking is permit-only after 18:00.",
    country: "United States",
    countryCode: "US",
    city: "Portland",
    publicAddress: "Portland, OR, United States",
    personCapacity: 4,
    bedroomsNumber: 1,
    bathroomsNumber: 1,
    bedsNumber: 1,
    checkInTimeStart: 15,
    checkInTimeEnd: 20,
    checkOutTime: 10,
    currencyCode: "USD",
    timeZoneName: "America/Los_Angeles",
    specialStatus: null,
    listingAmenities: [
      { id: 1, amenityId: 1 },
      { id: 2, amenityId: 2 },
      { id: 3, amenityId: 8 },
    ],
    listingImages: [
      {
        id: 9001,
        caption: "Living area",
        url: "https://example.invalid/fixtures/harbor-view-1.jpg",
        sortOrder: 1,
      },
      {
        id: 9002,
        caption: "Kitchenette",
        url: "https://example.invalid/fixtures/harbor-view-2.jpg",
        sortOrder: 2,
      },
    ],
    wifiUsername: "HarborGuest",
    wifiPassword: "harbor-wifi-secret-99",
    doorSecurityCode: "door-9911",
    invoicingContactName: "Billing",
    invoicingContactSurName: "Desk",
    invoicingContactPhone1: "+15550100101",
    invoicingContactPhone2: "+15550100102",
    invoicingContactLanguage: "en",
    invoicingContactEmail: "invoices@example.invalid",
    invoicingContactAddress: "1 Demo Street",
    invoicingContactCity: "Portland",
    invoicingContactZipcode: "97201",
    invoicingContactCountry: "US",
  },
  {
    id: 102,
    name: "Riverside Loft",
    externalListingName: "Riverside Loft",
    internalListingName: "RVL-102",
    description: "Two-level loft with a river-facing desk. Photos have not been uploaded yet.",
    houseRules: "Shoes off at the door. No extra guests without written approval. Quiet hours 23:00–07:00.",
    keyPickup: null,
    specialInstruction: null,
    country: "United Kingdom",
    countryCode: "GB",
    city: "Bristol",
    publicAddress: "Bristol, United Kingdom",
    personCapacity: 6,
    bedroomsNumber: 2,
    bathroomsNumber: 2,
    bedsNumber: 3,
    checkInTimeStart: 16,
    checkInTimeEnd: 21,
    checkOutTime: 11,
    currencyCode: "GBP",
    timeZoneName: "Europe/London",
    specialStatus: null,
    listingAmenities: [
      { id: 10, amenityId: 2 },
      { id: 11, amenityId: 3 },
      { id: 12, amenityId: 8 },
      { id: 13, amenityId: 16 },
    ],
    listingImages: [],
  },
  {
    id: 103,
    name: "Pine Cabin",
    externalListingName: "Pine Cabin",
    internalListingName: "PNC-103",
    description: "A small cabin. House rules and amenities have not been filled in Hostaway.",
    houseRules: "",
    keyPickup: null,
    specialInstruction: null,
    country: "Canada",
    countryCode: "CA",
    city: "Banff",
    publicAddress: "Banff, AB, Canada",
    personCapacity: 2,
    bedroomsNumber: 1,
    bathroomsNumber: 1,
    bedsNumber: 1,
    checkInTimeStart: 14,
    checkInTimeEnd: 18,
    checkOutTime: 10,
    currencyCode: "CAD",
    timeZoneName: "America/Edmonton",
    specialStatus: null,
    listingAmenities: [],
    listingImages: [
      {
        id: 9101,
        caption: "Exterior",
        url: "https://example.invalid/fixtures/pine-cabin-1.jpg",
        sortOrder: 1,
      },
    ],
  },
  {
    id: 199,
    name: "Archived Demo Unit",
    externalListingName: "Archived Demo Unit",
    internalListingName: "ARC-199",
    description: "Archived listing. Default list uses specialStatus[]=active and must omit this.",
    houseRules: "N/A",
    keyPickup: null,
    specialInstruction: null,
    country: "United States",
    countryCode: "US",
    city: "Portland",
    publicAddress: "Portland, OR, United States",
    personCapacity: 2,
    bedroomsNumber: 1,
    bathroomsNumber: 1,
    bedsNumber: 1,
    checkInTimeStart: 15,
    checkInTimeEnd: 18,
    checkOutTime: 10,
    currencyCode: "USD",
    timeZoneName: "America/Los_Angeles",
    specialStatus: "archived",
    listingAmenities: [],
    listingImages: [],
  },
];

export const RAW_RESERVATIONS: Reservation[] = [
  {
    id: 801,
    listingMapId: 101,
    channelName: "airbnb",
    guestName: "Alex Rivera",
    arrivalDate: "2026-08-01",
    departureDate: "2026-08-04",
    nights: 3,
    numberOfGuests: 2,
    status: "new",
    currency: "USD",
    totalPrice: 630,
    doorCode: "4321",
    doorCodeVendor: "igloohome",
    doorCodeInstruction: "box by the planter",
  },
  {
    id: 802,
    listingMapId: 102,
    channelName: "direct",
    guestName: "Sam Okonkwo",
    arrivalDate: "2026-08-12",
    departureDate: "2026-08-15",
    nights: 3,
    numberOfGuests: 3,
    status: "new",
    currency: "GBP",
    totalPrice: 540,
    doorCode: "8899",
    doorCodeVendor: "manual",
    doorCodeInstruction: "under the mat",
  },
  {
    id: 803,
    listingMapId: 101,
    channelName: "bookingcom",
    guestName: "Jordan Lee",
    arrivalDate: "2026-08-08",
    departureDate: "2026-08-10",
    nights: 2,
    numberOfGuests: 2,
    status: "new",
    currency: "USD",
    totalPrice: 440,
  },
];

function day(
  id: number,
  date: string,
  status: CalendarDay["status"],
  price: number | null,
  reservationIds: number[] = [],
): CalendarDay {
  const reservations = RAW_RESERVATIONS.filter((r) => reservationIds.includes(r.id));
  return {
    id,
    date,
    isAvailable: status === "available" ? 1 : 0,
    status,
    price,
    minimumStay: 1,
    reservations,
  };
}

/** Known August 2026 calendar for occupancy math (listing 101, 1–10). */
export const RAW_CALENDARS: Record<number, CalendarDay[]> = {
  101: [
    day(1, "2026-08-01", "reserved", 210, [801]),
    day(2, "2026-08-02", "reserved", 210, [801]),
    day(3, "2026-08-03", "reserved", 210, [801]),
    day(4, "2026-08-04", "available", 185),
    day(5, "2026-08-05", "available", 185),
    day(6, "2026-08-06", "blocked", 185),
    day(7, "2026-08-07", "blocked", 185),
    day(8, "2026-08-08", "reserved", 220, [803]),
    day(9, "2026-08-09", "reserved", 220, [803]),
    day(10, "2026-08-10", "available", 190),
    day(11, "2026-08-11", "available", null),
    day(12, "2026-08-12", "available", 175),
    day(13, "2026-08-13", "available", 175),
    day(14, "2026-08-14", "available", 175),
  ],
  102: [
    day(20, "2026-08-01", "available", 160),
    day(21, "2026-08-02", "available", 160),
    day(22, "2026-08-03", "blocked", 160),
    day(23, "2026-08-04", "blocked", 160),
    day(24, "2026-08-05", "available", 170),
    day(25, "2026-08-12", "reserved", 180, [802]),
    day(26, "2026-08-13", "reserved", 180, [802]),
    day(27, "2026-08-14", "reserved", 180, [802]),
  ],
  103: [
    day(30, "2026-08-01", "available", 95),
    day(31, "2026-08-02", "available", 95),
    day(32, "2026-08-03", "available", 95),
  ],
};

export const RAW_MESSAGES: ConversationMessage[] = [
  {
    id: 1,
    listingMapId: 101,
    reservationId: 801,
    conversationId: 501,
    body: "Thanks for booking Harbor View Studio. We will send arrival details from the Hostaway inbox closer to check-in.",
    isIncoming: 0,
    isSeen: 1,
    date: "2026-08-28 10:00:00",
    insertedOn: "2026-08-28 10:00:00",
  },
  {
    id: 2,
    listingMapId: 101,
    reservationId: 801,
    conversationId: 501,
    body: "What time is check-in and what is the wifi password? Also how much would an extra night on August 4 cost?",
    isIncoming: 1,
    isSeen: 0,
    date: "2026-08-30 15:00:00",
    insertedOn: "2026-08-30 15:00:00",
  },
  {
    id: 3,
    listingMapId: 102,
    reservationId: 802,
    conversationId: 502,
    body: "Can we check in a bit after the window if our train is late?",
    isIncoming: 1,
    isSeen: 0,
    date: "2026-08-30 19:40:00",
    insertedOn: "2026-08-30 19:40:00",
  },
  {
    id: 4,
    listingMapId: 101,
    reservationId: 803,
    conversationId: 503,
    body: "Is there a washer in the studio?",
    isIncoming: 1,
    isSeen: 1,
    date: "2026-08-20 09:00:00",
    insertedOn: "2026-08-20 09:00:00",
  },
  {
    id: 5,
    listingMapId: 101,
    reservationId: 803,
    conversationId: 503,
    body: "Harbor View Studio does not list a washer (amenityId 16 is absent). There is a kitchen (amenityId 8).",
    isIncoming: 0,
    isSeen: 1,
    date: "2026-08-20 09:20:00",
    insertedOn: "2026-08-20 09:20:00",
  },
  {
    id: 6,
    listingMapId: 103,
    reservationId: null,
    conversationId: 504,
    body: "Are pets allowed at Pine Cabin?",
    isIncoming: 1,
    isSeen: 0,
    date: "2026-08-29 12:00:00",
    insertedOn: "2026-08-29 12:00:00",
  },
];

export const RAW_CONVERSATIONS: Conversation[] = [
  {
    id: 501,
    listingMapId: 101,
    reservationId: 801,
    type: "host-guest-channel",
    recipientName: "Alex Rivera",
    hasUnreadMessages: 1,
    messageSentOn: "2026-08-28 10:00:00",
    messageReceivedOn: "2026-08-30 15:00:00",
    conversationMessages: RAW_MESSAGES.filter((m) => m.conversationId === 501),
    Reservation: RAW_RESERVATIONS.find((r) => r.id === 801),
  },
  {
    id: 502,
    listingMapId: 102,
    reservationId: 802,
    type: "host-guest-email",
    recipientName: "Sam Okonkwo",
    hasUnreadMessages: 1,
    messageSentOn: null,
    messageReceivedOn: "2026-08-30 19:40:00",
    conversationMessages: RAW_MESSAGES.filter((m) => m.conversationId === 502),
    Reservation: RAW_RESERVATIONS.find((r) => r.id === 802),
  },
  {
    id: 503,
    listingMapId: 101,
    reservationId: 803,
    type: "host-guest-channel",
    recipientName: "Jordan Lee",
    hasUnreadMessages: 0,
    messageSentOn: "2026-08-20 09:20:00",
    messageReceivedOn: "2026-08-20 09:00:00",
    conversationMessages: RAW_MESSAGES.filter((m) => m.conversationId === 503),
    Reservation: RAW_RESERVATIONS.find((r) => r.id === 803),
  },
  {
    id: 504,
    listingMapId: 103,
    reservationId: null,
    type: "host-guest-email",
    recipientName: "Casey Nguyen",
    hasUnreadMessages: 1,
    messageSentOn: null,
    messageReceivedOn: "2026-08-29 12:00:00",
    conversationMessages: RAW_MESSAGES.filter((m) => m.conversationId === 504),
  },
];

function nightsInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return [];
  }
  for (let t = start.getTime(); t < end.getTime(); t += 86_400_000) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
}

function listingAvailableForStay(
  listing: Listing,
  startDate: string,
  endDate: string,
  guests?: number,
): boolean {
  if (guests !== undefined && listing.personCapacity < guests) return false;
  const nights = nightsInRange(startDate, endDate);
  if (nights.length === 0) return false;
  const calendar = RAW_CALENDARS[listing.id] ?? [];
  const byDate = new Map(calendar.map((d) => [d.date, d]));
  return nights.every((date) => {
    const dayRow = byDate.get(date);
    return Boolean(dayRow && dayRow.status === "available" && dayRow.isAvailable === 1);
  });
}

export class FixtureStore implements HostawayStore {
  meta() {
    return {
      source: "fixtures" as const,
      stripped: true as const,
      modeNote: fixtureModeNote(),
    };
  }

  async listListings(query: ListingQuery = {}): Promise<Listing[]> {
    let rows = RAW_LISTINGS.slice();
    if (!query.includeArchived) {
      rows = rows.filter((l) => l.specialStatus !== "archived");
    }
    if (query.city) {
      const city = query.city.toLowerCase();
      rows = rows.filter((l) => (l.city ?? "").toLowerCase() === city);
    }
    if (query.match) {
      const needle = query.match.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(needle) ||
          (l.internalListingName ?? "").toLowerCase().includes(needle),
      );
    }
    if (query.availabilityDateStart && query.availabilityDateEnd) {
      rows = rows.filter((l) =>
        listingAvailableForStay(
          l,
          query.availabilityDateStart!,
          query.availabilityDateEnd!,
          query.availabilityGuestNumber,
        ),
      );
    } else if (query.availabilityGuestNumber !== undefined) {
      rows = rows.filter((l) => l.personCapacity >= query.availabilityGuestNumber!);
    }
    return stripSecrets(rows);
  }

  async getListing(listingId: number): Promise<Listing | null> {
    const listing = RAW_LISTINGS.find((l) => l.id === listingId);
    return listing ? stripSecrets(listing) : null;
  }

  async getCalendar(listingId: number, startDate: string, endDate: string): Promise<CalendarDay[]> {
    const days = RAW_CALENDARS[listingId] ?? [];
    return stripSecrets(
      days.filter((d) => d.date >= startDate && d.date <= endDate),
    );
  }

  async listReservations(query: ReservationQuery = {}): Promise<Reservation[]> {
    let rows = RAW_RESERVATIONS.slice();
    if (query.listingId !== undefined) {
      rows = rows.filter((r) => r.listingMapId === query.listingId);
    }
    if (query.arrivalStartDate) {
      rows = rows.filter((r) => r.arrivalDate >= query.arrivalStartDate!);
    }
    if (query.arrivalEndDate) {
      rows = rows.filter((r) => r.arrivalDate <= query.arrivalEndDate!);
    }
    if (query.match) {
      const needle = query.match.toLowerCase();
      rows = rows.filter((r) => r.guestName.toLowerCase().includes(needle));
    }
    return stripSecrets(rows);
  }

  async listConversations(query: ConversationQuery = {}): Promise<Conversation[]> {
    let rows = RAW_CONVERSATIONS.slice();
    if (query.reservationId !== undefined) {
      rows = rows.filter((c) => c.reservationId === query.reservationId);
    }
    if (query.listingId !== undefined) {
      rows = rows.filter((c) => c.listingMapId === query.listingId);
    }
    return stripSecrets(rows);
  }

  async getConversation(conversationId: number): Promise<Conversation | null> {
    const row = RAW_CONVERSATIONS.find((c) => c.id === conversationId);
    return row ? stripSecrets(row) : null;
  }

  async listMessages(conversationId: number): Promise<ConversationMessage[]> {
    return stripSecrets(RAW_MESSAGES.filter((m) => m.conversationId === conversationId));
  }

  async listAmenities(): Promise<Amenity[]> {
    return AMENITIES.map((a) => ({ ...a }));
  }
}

export function rawListing(id: number): Listing | undefined {
  return RAW_LISTINGS.find((l) => l.id === id);
}
