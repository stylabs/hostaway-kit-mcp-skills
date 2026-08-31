import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { containsDeniedField, isDeniedField, stripSecrets } from "../src/denylist.js";
import { FixtureStore, RAW_LISTINGS, RAW_RESERVATIONS, rawListing } from "../src/fixtures.js";

describe("denylist", () => {
  it("flags Hostaway access and invoicing contact fields", () => {
    for (const key of [
      "wifiPassword",
      "wifiUsername",
      "doorSecurityCode",
      "doorCode",
      "doorCodeVendor",
      "doorCodeInstruction",
      "invoicingContactName",
      "invoicingContactEmail",
      "invoicingContactLanguage",
    ]) {
      assert.equal(isDeniedField(key), true, key);
    }
    assert.equal(isDeniedField("houseRules"), false);
    assert.equal(isDeniedField("listingAmenities"), false);
  });

  it("fixture listing 101 stores a wifi password that must be stripped", () => {
    const raw = rawListing(101);
    assert.ok(raw);
    assert.equal(raw.wifiPassword, "harbor-wifi-secret-99");
    assert.equal(raw.invoicingContactEmail, "invoices@example.invalid");
    assert.ok(containsDeniedField(raw));
  });

  it("stripSecrets removes denied keys including nested reservation copies", () => {
    const raw = RAW_LISTINGS.find((l) => l.id === 101);
    const stripped = stripSecrets(raw);
    assert.equal(containsDeniedField(stripped), null);
    assert.equal("wifiPassword" in (stripped as object), false);
    assert.equal("invoicingContactEmail" in (stripped as object), false);

    const nested = stripSecrets({
      Reservation: RAW_RESERVATIONS[0],
      reservations: [RAW_RESERVATIONS[0]],
    });
    assert.equal(containsDeniedField(nested), null);
    assert.equal(nested.Reservation?.doorCode, undefined);
  });

  it("every store listing/reservation/message payload is stripped", async () => {
    const store = new FixtureStore();
    const listing = await store.getListing(101);
    assert.ok(listing);
    assert.equal(containsDeniedField(listing), null);
    assert.equal("wifiPassword" in listing, false);
    assert.equal(listing.houseRules?.includes("Pets are not allowed"), true);

    const reservations = await store.listReservations();
    assert.equal(containsDeniedField(reservations), null);
    assert.ok(reservations.some((r) => r.id === 801));
    assert.ok(reservations.every((r) => r.doorCode === undefined));

    const conversations = await store.listConversations();
    assert.equal(containsDeniedField(conversations), null);
    const withReservation = conversations.find((c) => c.id === 501);
    assert.equal(withReservation?.Reservation?.doorCode, undefined);

    const calendar = await store.getCalendar(101, "2026-08-01", "2026-08-04");
    assert.equal(containsDeniedField(calendar), null);
    assert.ok((calendar[0]?.reservations?.length ?? 0) > 0);
    assert.ok(calendar[0].reservations.every((r) => r.doorCode === undefined));

    const messages = await store.listMessages(501);
    assert.equal(containsDeniedField(messages), null);
  });
});
