import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { POKEDEX, PokedexEntry } from '@/data/pokedex';

const CACHE_KEY = 'pokedex-cache:v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon-species?limit=2000';

type Cache = { entries: PokedexEntry[]; fetchedAt: number };

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Keeps ids stable against the bundled master list (src/data/pokedex.ts) by
// matching on name, instead of trusting the API response's array order.
// Names not in the master list are new Pokémon the bundled file predates —
// they're appended after the highest known id.
function reconcileWithMasterList(names: string[]): PokedexEntry[] {
  const idByName = new Map(POKEDEX.map((entry) => [entry.name, entry.id]));
  let nextId = POKEDEX.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;

  const entries = names.map((name) => {
    const id = idByName.get(name) ?? nextId++;
    return { id, name };
  });
  entries.sort((a, b) => a.id - b.id);
  return entries;
}

async function fetchPokedex(): Promise<PokedexEntry[]> {
  const res = await fetch(POKEAPI_URL);
  if (!res.ok) {
    throw new Error(`PokeAPI species lookup failed: ${res.status}`);
  }
  const data: { results: { name: string }[] } = await res.json();
  const names = data.results.map((species) => titleCase(species.name));
  return reconcileWithMasterList(names);
}

async function readCache(): Promise<Cache | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function writeCache(entries: PokedexEntry[]): Promise<void> {
  const cache: Cache = { entries, fetchedAt: Date.now() };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function usePokedex(): PokedexEntry[] {
  const [entries, setEntries] = useState<PokedexEntry[]>(POKEDEX);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await readCache();
      if (cached && !cancelled) {
        setEntries(cached.entries);
      }

      const isStale = !cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS;
      if (!isStale) return;

      try {
        const fresh = await fetchPokedex();
        if (cancelled) return;
        await writeCache(fresh);
        setEntries(fresh);
      } catch (e) {
        console.warn('Failed to refresh Pokédex from PokeAPI', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return entries;
}
