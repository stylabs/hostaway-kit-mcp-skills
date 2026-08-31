/** Hostaway listing amenity is an id pair, not a free-text name. GET /v1/amenities resolves names. */
export type ListingAmenity = {
  id: number;
  amenityId: number;
};

export type ListingImage = {
  id: number;
  caption: string | null;
  url: string;
  sortOrder: number;
};

export type Listing = {
  id: number;
  name: string;
  externalListingName: string;
  internalListingName: string | null;
  description: string | null;
  houseRules: string | null;
  keyPickup: string | null;
  specialInstruction: string | null;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  publicAddress: string | null;
  personCapacity: number;
  bedroomsNumber: number | null;
  bathroomsNumber: number | null;
  bedsNumber: number | null;
  /** Accepted values are 0–23 (listing local timezone). */
  checkInTimeStart: number | null;
  checkInTimeEnd: number | null;
  /** Accepted values are 0–23 (listing local timezone). */
  checkOutTime: number | null;
  currencyCode: string;
  timeZoneName: string | null;
  specialStatus: "archived" | null;
  listingAmenities: ListingAmenity[];
  listingImages: ListingImage[];
  wifiUsername?: string | null;
  wifiPassword?: string | null;
  doorSecurityCode?: string | null;
  invoicingContactName?: string | null;
  invoicingContactSurName?: string | null;
  invoicingContactPhone1?: string | null;
  invoicingContactPhone2?: string | null;
  invoicingContactLanguage?: string | null;
  invoicingContactEmail?: string | null;
  invoicingContactAddress?: string | null;
  invoicingContactCity?: string | null;
  invoicingContactZipcode?: string | null;
  invoicingContactCountry?: string | null;
};

export type CalendarDay = {
  id: number;
  date: string;
  isAvailable: 0 | 1;
  status: "available" | "blocked" | "reserved" | "pending" | "hardBlock";
  price: number | null;
  minimumStay: number | null;
  reservations: Reservation[];
};

export type Reservation = {
  id: number;
  listingMapId: number;
  channelName: string;
  guestName: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  numberOfGuests: number;
  status: string;
  currency: string;
  totalPrice: number | null;
  doorCode?: string | null;
  doorCodeVendor?: string | null;
  doorCodeInstruction?: string | null;
};

export type ConversationMessage = {
  id: number;
  listingMapId: number;
  reservationId: number | null;
  conversationId: number;
  body: string;
  isIncoming: 0 | 1;
  isSeen: 0 | 1;
  date: string;
  insertedOn: string;
};

export type Conversation = {
  id: number;
  listingMapId: number;
  reservationId: number | null;
  type: string;
  recipientName: string | null;
  hasUnreadMessages: 0 | 1;
  messageSentOn: string | null;
  messageReceivedOn: string | null;
  conversationMessages: ConversationMessage[];
  Reservation?: Reservation | null;
};

export type Amenity = {
  id: number;
  name: string;
};

export type ListingQuery = {
  city?: string;
  match?: string;
  includeArchived?: boolean;
  availabilityDateStart?: string;
  availabilityDateEnd?: string;
  availabilityGuestNumber?: number;
};

export type ReservationQuery = {
  listingId?: number;
  arrivalStartDate?: string;
  arrivalEndDate?: string;
  match?: string;
};

export type ConversationQuery = {
  reservationId?: number;
  listingId?: number;
};

export type StoreMeta = {
  source: "fixtures" | "hostaway";
  stripped: true;
  modeNote: string;
};
