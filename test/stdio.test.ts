import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TOOL_NAMES } from "../src/server.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("stdio MCP", () => {
  it("lists tools and serves stripped fixture listings without credentials", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", join(root, "src/index.ts")],
      env: {
        ...process.env,
        HOSTAWAY_ACCOUNT_ID: "",
        HOSTAWAY_CLIENT_SECRET: "",
        HOSTAWAY_KIT_NOW: "2026-08-30T20:00:00.000Z",
      },
      stderr: "pipe",
    });

    const client = new Client({ name: "hostaway-kit-test", version: "0.0.0" });
    await client.connect(transport);

    try {
      const listed = await client.listTools();
      const names = listed.tools.map((t) => t.name).sort();
      assert.deepEqual(names, [...TOOL_NAMES].sort());
      assert.equal(names.includes("send_message"), false);

      const result = await client.callTool({ name: "get_listing", arguments: { listingId: 101 } });
      const text = (result.content as { type: string; text: string }[])[0]?.text ?? "";
      const payload = JSON.parse(text) as { listing: Record<string, unknown>; meta: { source: string } };
      assert.equal(payload.meta.source, "fixtures");
      assert.equal(payload.listing.id, 101);
      assert.equal("wifiPassword" in payload.listing, false);
      assert.equal(text.includes("harbor-wifi-secret-99"), false);

      const occupancy = await client.callTool({
        name: "report_occupancy",
        arguments: { listingId: 101, startDate: "2026-08-01", endDate: "2026-08-10" },
      });
      const occText = (occupancy.content as { type: string; text: string }[])[0]?.text ?? "";
      const occ = JSON.parse(occText) as { listings: { occupancyRate: number }[] };
      assert.equal(occ.listings[0].occupancyRate, 0.625);
    } finally {
      await client.close();
    }
  });

  it("starts as a stdio process and logs fixture mode on stderr", async () => {
    const child = spawn(process.execPath, ["--import", "tsx", join(root, "src/index.ts")], {
      cwd: root,
      env: { ...process.env, HOSTAWAY_ACCOUNT_ID: "", HOSTAWAY_CLIENT_SECRET: "" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stderr = await new Promise<string>((resolve, reject) => {
      let buf = "";
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`timed out waiting for ready log: ${buf}`));
      }, 8000);
      child.stderr.on("data", (chunk: Buffer) => {
        buf += chunk.toString();
        if (buf.includes("hostaway-kit MCP ready (fixtures)")) {
          clearTimeout(timer);
          resolve(buf);
        }
      });
      child.on("error", reject);
    });

    child.kill("SIGTERM");
    assert.match(stderr, /No send endpoint/);
  });
});
