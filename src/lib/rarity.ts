import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const API_BASE = 'https://api.tcgdex.net/v2/en';
const CACHE_KEY = 'tcgdex-rarities:v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type RarityMap = Record<string, string>;

type Cache = { rarities: string[]; cardRarity: Record<string, number>; fetchedAt: number };

function normalizeId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TCGdex rarity lookup failed: ${res.status}`);
  }
  return res.json();
}

async function fetchRarities(): Promise<Pick<Cache, 'rarities' | 'cardRarity'>> {
  const rarities = await fetchJson<string[]>(`${API_BASE}/rarities`);
  const groups = await Promise.all(
    rarities.map((rarity) =>
      fetchJson<{ cards: { id: string }[] }>(`${API_BASE}/rarities/${encodeURIComponent(rarity)}`),
    ),
  );

  const cardRarity: Record<string, number> = {};
  groups.forEach((group, index) => {
    for (const card of group.cards) {
      cardRarity[normalizeId(card.id)] = index;
    }
  });
  return { rarities, cardRarity };
}

function toRarityMap({ rarities, cardRarity }: Pick<Cache, 'rarities' | 'cardRarity'>): RarityMap {
  const map: RarityMap = {};
  for (const id in cardRarity) {
    map[id] = rarities[cardRarity[id]];
  }
  return map;
}

async function readCache(): Promise<Cache | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : null;
}

let mapPromise: Promise<RarityMap> | null = null;

export function getRarityMap(): Promise<RarityMap> {
  if (!mapPromise) {
    mapPromise = (async () => {
      const cached = await readCache().catch(() => null);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return toRarityMap(cached);
      }

      try {
        const fresh = await fetchRarities();
        const cache: Cache = { ...fresh, fetchedAt: Date.now() };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch((e) =>
          console.warn('Failed to cache TCGdex rarities', e),
        );
        return toRarityMap(cache);
      } catch (e) {
        if (cached) return toRarityMap(cached);
        throw e;
      }
    })().catch((e) => {
      mapPromise = null;
      throw e;
    });
  }
  return mapPromise;
}

export function rarityOf(map: RarityMap | null, cardId: string): string | undefined {
  const rarity = map?.[normalizeId(cardId)];
  return rarity && rarity !== 'None' ? rarity : undefined;
}

export function useRarityMap(): RarityMap | null {
  const [map, setMap] = useState<RarityMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRarityMap()
      .then((m) => {
        if (!cancelled) setMap(m);
      })
      .catch((e) => console.warn('Failed to load card rarities', e));
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}
