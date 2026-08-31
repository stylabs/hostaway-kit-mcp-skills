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
  StoreMeta,
} from "./types.js";

export interface HostawayStore {
  meta(): StoreMeta;
  listListings(query?: ListingQuery): Promise<Listing[]>;
  getListing(listingId: number): Promise<Listing | null>;
  getCalendar(listingId: number, startDate: string, endDate: string): Promise<CalendarDay[]>;
  listReservations(query?: ReservationQuery): Promise<Reservation[]>;
  listConversations(query?: ConversationQuery): Promise<Conversation[]>;
  getConversation(conversationId: number): Promise<Conversation | null>;
  listMessages(conversationId: number): Promise<ConversationMessage[]>;
  listAmenities(): Promise<Amenity[]>;
}

export function credentialsConfigured(): boolean {
  const id = process.env.HOSTAWAY_ACCOUNT_ID?.trim();
  const secret = process.env.HOSTAWAY_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}

export function fixtureModeNote(): string {
  return "Running on bundled fixtures. Set HOSTAWAY_ACCOUNT_ID and HOSTAWAY_CLIENT_SECRET to read a live Hostaway account. This kit never writes.";
}

export function liveModeNote(): string {
  return "Reading the Hostaway Public API (GET only). Hostaway remains the PMS. This kit never POSTs messages, calendar blocks, or reservations.";
}
