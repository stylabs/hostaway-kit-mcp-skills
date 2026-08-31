import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { FixtureStore } from "../src/fixtures.js";
import { occupancyFromCalendar, reportCompleteness, reportInbox, reportOccupancy } from "../src/reporting.js";

describe("reporting math", () => {
  before(() => {
    process.env.HOSTAWAY_KIT_NOW = "2026-08-30T20:00:00.000Z";
  });

  const store = new FixtureStore();

  it("computes occupancy and the blocked hole on listing 101 for 1–10 Aug 2026", async () => {
    const report = await reportOccupancy(store, "2026-08-01", "2026-08-10", 101);
    assert.equal(report.listings.length, 1);
    const row = report.listings[0];
    assert.equal(row.nightsTotal, 10);
    assert.equal(row.nightsReserved, 5);
    assert.equal(row.nightsAvailable, 3);
    assert.equal(row.nightsBlocked, 2);
    assert.equal(row.occupancyRate, 0.625);
    assert.deepEqual(row.blockedHoles, [
      { startDate: "2026-08-06", endDate: "2026-08-07", nights: 2 },
    ]);
  });

  it("occupancyFromCalendar matches reserved / (reserved + available)", () => {
    const row = occupancyFromCalendar(
      { id: 1, name: "Unit" },
      "2026-08-01",
      "2026-08-04",
      [
        { id: 1, date: "2026-08-01", isAvailable: 0, status: "reserved", price: 10, minimumStay: 1, reservations: [] },
        { id: 2, date: "2026-08-02", isAvailable: 1, status: "available", price: 10, minimumStay: 1, reservations: [] },
        { id: 3, date: "2026-08-03", isAvailable: 0, status: "blocked", price: 10, minimumStay: 1, reservations: [] },
        { id: 4, date: "2026-08-04", isAvailable: 0, status: "reserved", price: 10, minimumStay: 1, reservations: [] },
      ],
    );
    assert.equal(row.nightsReserved, 2);
    assert.equal(row.nightsAvailable, 1);
    assert.equal(row.nightsBlocked, 1);
    assert.equal(row.occupancyRate, 0.6667);
    assert.deepEqual(row.blockedHoles, [{ startDate: "2026-08-03", endDate: "2026-08-03", nights: 1 }]);
  });

  it("counts unanswered threads from fixture inbox", async () => {
    const report = await reportInbox(store, { slaHours: 2 });
    assert.equal(report.unansweredThreads, 3);
    assert.equal(report.breachedThreads, 2);
    assert.equal(report.waitingThreads, 1);
    assert.equal(report.answeredThreads, 1);
    const harbor = report.byListing.find((r) => r.listingId === 101);
    assert.equal(harbor?.unanswered, 1);
    assert.equal(harbor?.breached, 1);
  });

  it("flags listing completeness gaps", async () => {
    const report = await reportCompleteness(store);
    const loft = report.listings.find((r) => r.listingId === 102);
    const cabin = report.listings.find((r) => r.listingId === 103);
    const harbor = report.listings.find((r) => r.listingId === 101);
    assert.deepEqual(loft?.issues, ["missing photos"]);
    assert.ok(cabin?.issues.includes("missing house rules"));
    assert.ok(cabin?.issues.includes("missing amenities"));
    assert.deepEqual(harbor?.issues, []);
  });
});
