import { DEFAULT_SLA_HOURS, inboxTriage } from "./inbox.js";
import type { HostawayStore } from "./store.js";
import type { CalendarDay, Listing } from "./types.js";

export type OccupancyListing = {
  listingId: number;
  listingName: string;
  startDate: string;
  endDate: string;
  nightsTotal: number;
  nightsReserved: number;
  nightsAvailable: number;
  nightsBlocked: number;
  nightsPending: number;
  /** reserved / (reserved + available). Blocked nights are excluded from the denominator. */
  occupancyRate: number | null;
  blockedHoles: { startDate: string; endDate: string; nights: number }[];
};

export type CompletenessRow = {
  listingId: number;
  listingName: string;
  missingPhotos: boolean;
  photoCount: number;
  missingHouseRules: boolean;
  missingAmenities: boolean;
  amenityCount: number;
  issues: string[];
};

export async function reportOccupancy(
  store: HostawayStore,
  startDate: string,
  endDate: string,
  listingId?: number,
): Promise<{ meta: ReturnType<HostawayStore["meta"]>; range: { startDate: string; endDate: string }; listings: OccupancyListing[] }> {
  const listings = listingId
    ? [await store.getListing(listingId)].filter((l): l is Listing => Boolean(l))
    : await store.listListings();

  const rows: OccupancyListing[] = [];
  for (const listing of listings) {
    const days = await store.getCalendar(listing.id, startDate, endDate);
    rows.push(occupancyFromCalendar(listing, startDate, endDate, days));
  }

  return {
    meta: store.meta(),
    range: { startDate, endDate },
    listings: rows,
  };
}

export function occupancyFromCalendar(
  listing: Pick<Listing, "id" | "name">,
  startDate: string,
  endDate: string,
  days: CalendarDay[],
): OccupancyListing {
  const nightsReserved = days.filter((d) => d.status === "reserved").length;
  const nightsAvailable = days.filter((d) => d.status === "available").length;
  const nightsBlocked = days.filter((d) => d.status === "blocked" || d.status === "hardBlock").length;
  const nightsPending = days.filter((d) => d.status === "pending").length;
  const bookable = nightsReserved + nightsAvailable;
  return {
    listingId: listing.id,
    listingName: listing.name,
    startDate,
    endDate,
    nightsTotal: days.length,
    nightsReserved,
    nightsAvailable,
    nightsBlocked,
    nightsPending,
    occupancyRate: bookable === 0 ? null : round4(nightsReserved / bookable),
    blockedHoles: blockedHoles(days),
  };
}

export function blockedHoles(days: CalendarDay[]): { startDate: string; endDate: string; nights: number }[] {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const holes: { startDate: string; endDate: string; nights: number }[] = [];
  let run: CalendarDay[] = [];

  const flush = () => {
    if (run.length === 0) return;
    holes.push({
      startDate: run[0].date,
      endDate: run[run.length - 1].date,
      nights: run.length,
    });
    run = [];
  };

  for (const day of ordered) {
    if (day.status === "blocked" || day.status === "hardBlock") {
      run.push(day);
    } else {
      flush();
    }
  }
  flush();
  return holes;
}

export async function reportInbox(
  store: HostawayStore,
  options: { slaHours?: number; listingId?: number } = {},
): Promise<{
  meta: ReturnType<HostawayStore["meta"]>;
  slaHours: number;
  unansweredThreads: number;
  breachedThreads: number;
  waitingThreads: number;
  answeredThreads: number;
  byListing: { listingId: number; listingName: string | null; unanswered: number; breached: number }[];
}> {
  const slaHours = options.slaHours ?? DEFAULT_SLA_HOURS;
  const triage = await inboxTriage(store, options);
  const unanswered = triage.threads.filter((t) => t.unanswered);
  const byListingMap = new Map<number, { listingId: number; listingName: string | null; unanswered: number; breached: number }>();
  for (const thread of triage.threads) {
    const current = byListingMap.get(thread.listingId) ?? {
      listingId: thread.listingId,
      listingName: thread.listingName,
      unanswered: 0,
      breached: 0,
    };
    if (thread.unanswered) current.unanswered += 1;
    if (thread.status === "breached") current.breached += 1;
    byListingMap.set(thread.listingId, current);
  }
  return {
    meta: store.meta(),
    slaHours,
    unansweredThreads: unanswered.length,
    breachedThreads: triage.threads.filter((t) => t.status === "breached").length,
    waitingThreads: triage.threads.filter((t) => t.status === "waiting").length,
    answeredThreads: triage.threads.filter((t) => t.status === "answered").length,
    byListing: [...byListingMap.values()],
  };
}

export async function reportCompleteness(
  store: HostawayStore,
  listingId?: number,
): Promise<{ meta: ReturnType<HostawayStore["meta"]>; listings: CompletenessRow[] }> {
  const listings = listingId
    ? [await store.getListing(listingId)].filter((l): l is Listing => Boolean(l))
    : await store.listListings();

  const rows = listings.map((listing) => completenessOf(listing));
  rows.sort((a, b) => b.issues.length - a.issues.length);
  return { meta: store.meta(), listings: rows };
}

export function completenessOf(listing: Listing): CompletenessRow {
  const photoCount = listing.listingImages?.length ?? 0;
  const amenityCount = listing.listingAmenities?.length ?? 0;
  const missingPhotos = photoCount === 0;
  const missingHouseRules = !listing.houseRules || listing.houseRules.trim().length === 0;
  const missingAmenities = amenityCount === 0;
  const issues: string[] = [];
  if (missingPhotos) issues.push("missing photos");
  if (missingHouseRules) issues.push("missing house rules");
  if (missingAmenities) issues.push("missing amenities");
  return {
    listingId: listing.id,
    listingName: listing.name,
    missingPhotos,
    photoCount,
    missingHouseRules,
    missingAmenities,
    amenityCount,
    issues,
  };
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
