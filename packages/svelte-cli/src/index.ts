#!/usr/bin/env node

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .usage("usage: $0 <Ruest server address>")
  .demandCommand(1, "Ruest compatible server address is required")
  .help(true)
  .parseSync();

const serverAddress = argv._[0] as string;
const serverUrl = new URL("/.schema.json", serverAddress);

console.log("Fetching schema...");

fetch(serverUrl).then(async (response) => {
  if (!response.ok) {
    console.error(`Failed to fetch schema, server responded with: ${response.status} - ${response.statusText}`);
    process.exit(1);
  }

  const schema = await response.json();
  console.log(schema);
});
