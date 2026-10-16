import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const ALL_SET_CARDS_URL = 'https://www.optcgapi.com/api/allSetCards/';
const CACHE_KEY = 'optcg-cards:v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type OnePieceRawCard = {
  card_set_id: string;
  card_image_id: string;
  card_name: string;
  set_id: string;
  set_name: string;
  card_image: string;
  rarity: string;
  market_price: number | null;
  inventory_price: number | null;
};

export type OnePiecePrinting = {
  key: string;
  cardId: string;
  name: string;
  image: string;
  setId: string;
  setName: string;
  rarity: string;
  market: number | null;
  inventory: number | null;
};

export type OnePieceEntry = {
  id: string;
  name: string;
  image?: string;
  printingCount: number;
};

export type OnePieceCatalog = {
  entries: OnePieceEntry[];
  printingsById: Map<string, OnePiecePrinting[]>;
};

type Cache = { printings: OnePiecePrinting[]; fetchedAt: number };

function toPrinting(raw: OnePieceRawCard): OnePiecePrinting {
  return {
    key: `${raw.card_image_id}@${raw.set_id}`,
    cardId: raw.card_set_id,
    name: raw.card_name,
    image: raw.card_image,
    setId: raw.set_id,
    setName: raw.set_name,
    rarity: raw.rarity,
    market: raw.market_price,
    inventory: raw.inventory_price,
  };
}

const VARIANT_SUFFIXES = /\s*\([^)]*\)|\s*-\s*[A-Z]{1,3}\d{2}-\d{3}$/g;

function characterName(cardName: string): string {
  return cardName.replace(VARIANT_SUFFIXES, '').trim();
}

function characterId(name: string): string {
  return `op-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

function buildCatalog(printings: OnePiecePrinting[]): OnePieceCatalog {
  const printingsById = new Map<string, OnePiecePrinting[]>();
  const names = new Map<string, string>();

  for (const printing of printings) {
    const name = characterName(printing.name);
    const id = characterId(name);
    const group = printingsById.get(id);
    if (group) group.push(printing);
    else {
      printingsById.set(id, [printing]);
      names.set(id, name);
    }
  }

  const entries: OnePieceEntry[] = [];
  for (const [id, group] of printingsById) {
    group.sort((a, b) => a.cardId.localeCompare(b.cardId) || a.key.localeCompare(b.key));
    const base = group.find((p) => characterName(p.name) === p.name) ?? group[0];
    entries.push({ id, name: names.get(id)!, image: base.image, printingCount: group.length });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  return { entries, printingsById };
}

async function fetchPrintings(): Promise<OnePiecePrinting[]> {
  const res = await fetch(ALL_SET_CARDS_URL);
  if (!res.ok) {
    throw new Error(`OPTCG card lookup failed: ${res.status}`);
  }
  const data: OnePieceRawCard[] = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('OPTCG card list unavailable');
  }

  const seen = new Set<string>();
  const printings: OnePiecePrinting[] = [];
  for (const raw of data) {
    const printing = toPrinting(raw);
    if (seen.has(printing.key)) continue;
    seen.add(printing.key);
    printings.push(printing);
  }
  return printings;
}

async function readCache(): Promise<Cache | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function writeCache(printings: OnePiecePrinting[]): Promise<void> {
  const cache: Cache = { printings, fetchedAt: Date.now() };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

let catalogPromise: Promise<OnePieceCatalog> | null = null;

export function getOnePieceCatalog(): Promise<OnePieceCatalog> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const cached = await readCache().catch(() => null);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return buildCatalog(cached.printings);
      }

      try {
        const printings = await fetchPrintings();
        await writeCache(printings).catch((e) => console.warn('Failed to cache OPTCG cards', e));
        return buildCatalog(printings);
      } catch (e) {
        if (cached) return buildCatalog(cached.printings);
        throw e;
      }
    })().catch((e) => {
      catalogPromise = null;
      throw e;
    });
  }
  return catalogPromise;
}

export function useOnePieceCatalog(): { catalog: OnePieceCatalog | null; error: string | null } {
  const [state, setState] = useState<{ catalog: OnePieceCatalog | null; error: string | null }>({
    catalog: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    getOnePieceCatalog()
      .then((catalog) => {
        if (!cancelled) setState({ catalog, error: null });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            catalog: null,
            error: e instanceof Error ? e.message : 'Failed to load One Piece cards',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
