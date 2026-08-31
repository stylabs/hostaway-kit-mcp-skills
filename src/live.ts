import { stripSecrets } from "./denylist.js";
import { credentialsConfigured, liveModeNote, type HostawayStore } from "./store.js";
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

const API_ROOT = "https://api.hostaway.com/v1";

type TokenCache = {
  accessToken: string;
  fetchedAt: number;
};

/**
 * Live Hostaway Public API client. GET only.
 * Auth: POST /v1/accessTokens (client_credentials, scope=general).
 * Mapping verified against https://api.hostaway.com/documentation
 */
export class LiveHostawayStore implements HostawayStore {
  private token: TokenCache | null = null;

  meta() {
    return {
      source: "hostaway" as const,
      stripped: true as const,
      modeNote: liveModeNote(),
    };
  }

  async listListings(query: ListingQuery = {}): Promise<Listing[]> {
    const params = new URLSearchParams();
    params.set("includeResources", "1");
    if (!query.includeArchived) {
      params.append("specialStatus[]", "active");
    }
    if (query.city) params.set("city", query.city);
    if (query.match) params.set("match", query.match);
    if (query.availabilityDateStart) params.set("availabilityDateStart", query.availabilityDateStart);
    if (query.availabilityDateEnd) params.set("availabilityDateEnd", query.availabilityDateEnd);
    if (query.availabilityGuestNumber !== undefined) {
      params.set("availabilityGuestNumber", String(query.availabilityGuestNumber));
    }
    const result = await this.getJson<Listing[]>(`/listings?${params.toString()}`);
    return stripSecrets(result ?? []);
  }

  async getListing(listingId: number): Promise<Listing | null> {
    const result = await this.getJson<Listing>(`/listings/${listingId}?includeResources=1`);
    return result ? stripSecrets(result) : null;
  }

  async getCalendar(listingId: number, startDate: string, endDate: string): Promise<CalendarDay[]> {
    const params = new URLSearchParams({
      startDate,
      endDate,
      includeResources: "1",
    });
    const result = await this.getJson<CalendarDay[]>(
      `/listings/${listingId}/calendar?${params.toString()}`,
    );
    return stripSecrets(result ?? []);
  }

  async listReservations(query: ReservationQuery = {}): Promise<Reservation[]> {
    const params = new URLSearchParams();
    params.set("includeResources", "1");
    if (query.listingId !== undefined) params.set("listingId", String(query.listingId));
    if (query.arrivalStartDate) params.set("arrivalStartDate", query.arrivalStartDate);
    if (query.arrivalEndDate) params.set("arrivalEndDate", query.arrivalEndDate);
    if (query.match) params.set("match", query.match);
    const result = await this.getJson<Reservation[]>(`/reservations?${params.toString()}`);
    return stripSecrets(result ?? []);
  }

  async listConversations(query: ConversationQuery = {}): Promise<Conversation[]> {
    const params = new URLSearchParams();
    params.set("includeResources", "1");
    if (query.reservationId !== undefined) {
      params.set("reservationId", String(query.reservationId));
    }
    const result = await this.getJson<Conversation[]>(`/conversations?${params.toString()}`);
    let rows = stripSecrets(result ?? []);
    if (query.listingId !== undefined) {
      rows = rows.filter((c) => c.listingMapId === query.listingId);
    }
    return rows;
  }

  async getConversation(conversationId: number): Promise<Conversation | null> {
    const result = await this.getJson<Conversation>(
      `/conversations/${conversationId}?includeResources=1`,
    );
    return result ? stripSecrets(result) : null;
  }

  async listMessages(conversationId: number): Promise<ConversationMessage[]> {
    const result = await this.getJson<ConversationMessage[]>(
      `/conversations/${conversationId}/messages`,
    );
    return stripSecrets(result ?? []);
  }

  async listAmenities(): Promise<Amenity[]> {
    const result = await this.getJson<Amenity[]>("/amenities");
    return result ?? [];
  }

  private async getJson<T>(path: string): Promise<T | null> {
    const response = await this.request("GET", path);
    if (response.status === 404) return null;
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Hostaway GET ${path} failed (${response.status}): ${body}`);
    }
    const payload = (await response.json()) as { status?: string; result?: T };
    if (payload.status === "fail") {
      throw new Error(`Hostaway GET ${path} returned fail`);
    }
    return (payload.result ?? null) as T | null;
  }

  private async request(method: "GET", path: string, retried = false): Promise<Response> {
    const token = await this.accessToken();
    const response = await fetch(`${API_ROOT}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-control": "no-cache",
      },
    });
    if ((response.status === 401 || response.status === 403) && !retried) {
      this.token = null;
      return this.request(method, path, true);
    }
    return response;
  }

  private async accessToken(): Promise<string> {
    if (this.token) return this.token.accessToken;

    const clientId = process.env.HOSTAWAY_ACCOUNT_ID?.trim();
    const clientSecret = process.env.HOSTAWAY_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new Error("HOSTAWAY_ACCOUNT_ID and HOSTAWAY_CLIENT_SECRET are required for live mode.");
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "general",
    });

    const response = await fetch(`${API_ROOT}/accessTokens`, {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded",
        "Cache-control": "no-cache",
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Hostaway token request failed (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as { access_token?: string };
    if (!payload.access_token) {
      throw new Error("Hostaway token response did not include access_token.");
    }

    this.token = { accessToken: payload.access_token, fetchedAt: Date.now() };
    return this.token.accessToken;
  }
}

export function assertNoWriteMethods(store: HostawayStore): void {
  const record = store as HostawayStore & Record<string, unknown>;
  const banned = [
    "sendMessage",
    "postMessage",
    "createReservation",
    "updateCalendar",
    "blockCalendar",
    "createListing",
  ];
  for (const name of banned) {
    if (typeof record[name] === "function") {
      throw new Error(`Write method ${name} must not exist`);
    }
  }
}

export function canUseLiveStore(): boolean {
  return credentialsConfigured();
}
