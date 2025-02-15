#!/usr/bin/env node

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { compile, JSONSchema } from "json-schema-to-typescript";
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from "node:path";

const bannerComment = `
/**
 * * This file was automatically generated by @ruest/svelte-cli.
 * * DO NOT MODIFY IT BY HAND. If you wish to update the file,
 * * run @ruest/svelte-cli to get the latest schemas.
 * */`;

interface RuestSchemaEntry {
  mime_types: string[];
  schema: JSONSchema;
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeTsFile(folder: string, fileName: string, content: string, overwrite = true) {
  const fullPath = join(folder, fileName);
  if (!overwrite) {
    if (await exists(fullPath)) {
      console.log(`File ${fullPath} already exists, skipping...`);
      return;
    }
  }

  await mkdir(folder, { recursive: true });
  const data = new Uint8Array(Buffer.from(content));
  const file = join(folder, fileName);
  await writeFile(file, data);
}

async function processEntry(input: RuestSchemaEntry, libFolder: string) {
  console.log("MIME Types:", input.mime_types);
  const title = input.schema.title ?? "Untitled";
  console.log("Schema title:", title);
  console.log("Schema:", input.schema);

  const ts = await compile(input.schema, title, { additionalProperties: false, bannerComment: bannerComment })
  console.log("Generated TypeScript:", ts);
  
  const ruestFolder = join(libFolder, "ruest");
  await writeTsFile(ruestFolder, `${title}.ts`, ts);

  const componentFolder = join(libFolder, "components");
  await writeTsFile(componentFolder, `${title}Component.svelte`, `<script lang="ts">
  import type { ${title} } from '../ruest/${title}'

  export let data: ${title}
</script>

<h1>${title}</h1>`, false);
}

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
    console.error(
      `Failed to fetch schema, server responded with: ${response.status} - ${response.statusText}`
    );
    process.exit(1);
  }

  const schema = await response.json();

  const schemaComponentMap = new Map<string, string>();
  const knownMimeTypes = new Set<string>();
  const libFolder = join("src", "lib");

  for (const entry of schema) {
    const rs = entry as RuestSchemaEntry;
    const title = rs.schema.title ?? "Untitled";
    
    for (const mime of rs.mime_types) {
      schemaComponentMap.set(mime, title);
      knownMimeTypes.add(mime);
    }

    processEntry(rs, libFolder).catch((err) => { console.error("Failed to process schema entry:", err); });
  }

  console.log("Schema component map:", schemaComponentMap);
  console.log("Known MIME Types:", knownMimeTypes);
});
