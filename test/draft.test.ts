import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { draftReply, inboxTriage } from "../src/inbox.js";
import { FixtureStore, rawListing } from "../src/fixtures.js";

describe("draft path", () => {
  before(() => {
    process.env.HOSTAWAY_KIT_NOW = "2026-08-30T20:00:00.000Z";
  });

  const store = new FixtureStore();

  it("triages SLA breach on conversation 501 and waiting on 502", async () => {
    const triage = await inboxTriage(store, { slaHours: 2 });
    const overdue = triage.threads.find((t) => t.conversationId === 501);
    const fresh = triage.threads.find((t) => t.conversationId === 502);
    const done = triage.threads.find((t) => t.conversationId === 503);
    assert.equal(overdue?.status, "breached");
    assert.equal(overdue?.hoursWaiting, 5);
    assert.equal(fresh?.status, "waiting");
    assert.equal(done?.status, "answered");
  });

  it("refuses wifi secrets and uses the calendar price for 4 August", async () => {
    const raw = rawListing(101);
    assert.equal(raw?.wifiPassword, "harbor-wifi-secret-99");

    const draft = await draftReply(store, 501);
    assert.equal(draft.send, false);
    assert.equal(draft.sendEndpoint, null);
    assert.match(draft.note, /no send endpoint/i);
    assert.equal(draft.suggestedReply.includes("harbor-wifi-secret-99"), false);
    assert.equal(draft.suggestedReply.includes("HarborGuest"), false);
    assert.equal(draft.suggestedReply.includes("door-9911"), false);
    assert.ok(draft.refusals.some((r) => /wifi/i.test(r)));
    assert.match(draft.suggestedReply, /15:00–20:00/);
    assert.match(draft.suggestedReply, /USD 185/);
    assert.ok(!draft.suggestedReply.includes("210") || draft.suggestedReply.includes("185"));
  });

  it("refuses to invent a rate when the calendar price is null", async () => {
    const draft = await draftReply(store, 501, "How much is August 11?");
    assert.match(draft.suggestedReply, /unknown/i);
    assert.ok(draft.refusals.some((r) => /unknown/i.test(r)));
    assert.equal(draft.suggestedReply.includes("harbor-wifi-secret-99"), false);
    const invented = draft.suggestedReply.match(/USD\s+(\d+)/);
    assert.equal(invented, null);
    assert.equal(draft.send, false);
  });

  it("does not invent house rules when they are empty", async () => {
    const draft = await draftReply(store, 504, "Are pets allowed?");
    assert.match(draft.suggestedReply, /not filled in|not set/i);
    assert.equal(/pets are allowed/i.test(draft.suggestedReply), false);
    assert.equal(draft.send, false);
    assert.equal(draft.sendEndpoint, null);
  });
});
