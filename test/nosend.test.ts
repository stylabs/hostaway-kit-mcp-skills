import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { FixtureStore } from "../src/fixtures.js";
import { assertNoWriteMethods, LiveHostawayStore } from "../src/live.js";
import { TOOL_NAMES, hasWriteToolName } from "../src/server.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("no send / no writes", () => {
  it("registers only read tools", () => {
    assert.deepEqual(
      [...TOOL_NAMES],
      [
        "list_listings",
        "get_listing",
        "get_calendar",
        "list_reservations",
        "list_conversations",
        "list_messages",
        "inbox_triage",
        "draft_reply",
        "report_occupancy",
        "report_inbox",
        "report_completeness",
      ],
    );
    for (const name of TOOL_NAMES) {
      assert.equal(hasWriteToolName(name), false, name);
    }
    assert.equal(
      TOOL_NAMES.some((n) => /send/.test(n)),
      false,
    );
  });

  it("store classes expose no write methods", () => {
    assertNoWriteMethods(new FixtureStore());
    assertNoWriteMethods(new LiveHostawayStore());
  });

  it("source never wires POST /v1/conversations messages or create reservation", () => {
    const files = [
      "src/live.ts",
      "src/server.ts",
      "src/inbox.ts",
      "src/fixtures.ts",
      "src/store.ts",
    ];
    for (const file of files) {
      const text = readFileSync(join(root, file), "utf8");
      assert.doesNotMatch(text, /POST\s+.*\/conversations\/.+\/messages/);
      assert.doesNotMatch(text, /conversations\/\$\{[^}]+}\/messages[\s\S]{0,80}method:\s*["']POST/);
      assert.doesNotMatch(text, /(?:async\s+|function\s+|export\s+function\s+)createReservation/);
      assert.doesNotMatch(text, /(?:async\s+|function\s+)sendMessage/);
      assert.doesNotMatch(text, /send_message/);
      assert.doesNotMatch(text, /["']POST["'][\s\S]{0,120}\/reservations/);
    }
  });

  it("live client only allows GET after auth", () => {
    const live = readFileSync(join(root, "src/live.ts"), "utf8");
    assert.match(live, /private async request\(method: "GET"/);
    assert.match(live, /\/listings\?/);
    assert.match(live, /specialStatus\[\]/);
    assert.match(live, /includeResources/);
  });
});
