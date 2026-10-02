// Dev-time only: regenerates src/data/pokedex.ts from PokeAPI.
// Run manually (`node scripts/generate-pokedex.mjs`) and ship the updated
// file in a normal app release — the app itself never calls this API.
//
// Existing entries keep their id (matched by name) so dex numbers stay
// stable across regenerations; only names not already in the file are
// treated as new and appended after the current highest id.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '../src/data/pokedex.ts');
const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon-species?limit=2000';

function titleCase(slug) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readExistingEntries() {
  if (!existsSync(OUTPUT_PATH)) return [];
  const source = readFileSync(OUTPUT_PATH, 'utf8');
  const match = source.match(/export const POKEDEX: PokedexEntry\[\] = (\[[\s\S]*\]);/);
  if (!match) return [];
  return JSON.parse(match[1]);
}

async function fetchSpeciesNames() {
  const res = await fetch(POKEAPI_URL);
  if (!res.ok) {
    throw new Error(`PokeAPI species lookup failed: ${res.status}`);
  }
  const data = await res.json();
  return data.results.map((species) => titleCase(species.name));
}

async function main() {
  const existing = readExistingEntries();
  const existingIdByName = new Map(existing.map((entry) => [entry.name, entry.id]));
  let nextId = existing.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;

  const names = await fetchSpeciesNames();
  const entries = names.map((name) => {
    const id = existingIdByName.get(name) ?? nextId++;
    return { id, name };
  });
  entries.sort((a, b) => a.id - b.id);

  const newCount = entries.length - existing.length;
  if (newCount > 0) {
    console.log(`Added ${newCount} new Pokémon.`);
  } else if (newCount < 0) {
    console.log(`Warning: ${existing.length - entries.length} previously known Pokémon are missing from the API response.`);
  } else {
    console.log('No changes.');
  }

  const content = `export type PokedexEntry = { id: number; name: string };\n\nexport const POKEDEX: PokedexEntry[] = ${JSON.stringify(entries, null, 2)};\n`;
  writeFileSync(OUTPUT_PATH, content);
  console.log(`Wrote ${entries.length} entries to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
