import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FixtureStore, RAW_LISTINGS } from "../src/fixtures.js";

describe("fixtures", () => {
  const store = new FixtureStore();

  it("runs in fixture mode with a stripped meta flag", () => {
    const meta = store.meta();
    assert.equal(meta.source, "fixtures");
    assert.equal(meta.stripped, true);
  });

  it("defaults to active listings like specialStatus[]=active", async () => {
    const listings = await store.listListings();
    assert.deepEqual(
      listings.map((l) => l.id).sort(),
      [101, 102, 103],
    );
    assert.ok(RAW_LISTINGS.some((l) => l.id === 199 && l.specialStatus === "archived"));
  });

  it("includes a listing with no photos and a listing missing house rules and amenities", async () => {
    const loft = await store.getListing(102);
    const cabin = await store.getListing(103);
    assert.equal(loft?.listingImages.length, 0);
    assert.equal(cabin?.houseRules, "");
    assert.equal(cabin?.listingAmenities.length, 0);
    assert.ok((loft?.listingImages.length ?? 1) === 0);
  });

  it("keeps amenityId integers and 0–23 check-in hours", async () => {
    const listing = await store.getListing(101);
    assert.ok(listing);
    assert.ok(listing.listingAmenities.every((a) => typeof a.amenityId === "number"));
    assert.ok(!JSON.stringify(listing.listingAmenities).includes("Kitchen"));
    assert.equal(listing.checkInTimeStart, 15);
    assert.equal(listing.checkInTimeEnd, 20);
    assert.equal(listing.checkOutTime, 10);
    for (const hour of [listing.checkInTimeStart, listing.checkInTimeEnd, listing.checkOutTime]) {
      assert.ok(hour !== null && hour >= 0 && hour <= 23);
    }
  });

  it("filters listings with availabilityDateStart/End and availabilityGuestNumber", async () => {
    const open = await store.listListings({
      availabilityDateStart: "2026-08-04",
      availabilityDateEnd: "2026-08-06",
      availabilityGuestNumber: 2,
    });
    assert.ok(open.some((l) => l.id === 101));

    const tooManyGuests = await store.listListings({
      availabilityDateStart: "2026-08-04",
      availabilityDateEnd: "2026-08-06",
      availabilityGuestNumber: 5,
    });
    assert.ok(!tooManyGuests.some((l) => l.id === 101));

    const reservedStay = await store.listListings({
      availabilityDateStart: "2026-08-01",
      availabilityDateEnd: "2026-08-04",
    });
    assert.ok(!reservedStay.some((l) => l.id === 101));
  });

  it("exposes unread threads on known conversations", async () => {
    const conversations = await store.listConversations();
    const unread = conversations.filter((c) => c.hasUnreadMessages === 1);
    assert.ok(unread.some((c) => c.id === 501));
    assert.ok(unread.some((c) => c.id === 502));
    assert.ok(unread.some((c) => c.id === 504));
    const answered = conversations.find((c) => c.id === 503);
    assert.equal(answered?.hasUnreadMessages, 0);
  });
});
