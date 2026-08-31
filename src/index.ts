#!/usr/bin/env node
import { startStdioServer } from "./server.js";

startStdioServer().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
