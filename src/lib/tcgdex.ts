const API_BASE = 'https://api.tcgdex.net/v2/en';

export type CardBrief = {
  id: string;
  localId: string;
  name: string;
  image?: string;
};

export type CardMarketPricing = {
  unit?: string;
  updated?: string;
  avg?: number;
  low?: number;
  trend?: number;
};

export type CardPricing = {
  cardmarket?: CardMarketPricing;
};

export type CardFull = CardBrief & {
  category?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  set?: { id: string; name: string };
  pricing?: CardPricing;
};

export type SetBrief = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: { total: number; official: number };
};

export function cardImageUrl(image: string, quality: 'low' | 'high' = 'high', extension: 'png' | 'webp' | 'jpg' = 'png') {
  return `${image}/${quality}.${extension}`;
}

export async function getCardsByDexId(dexId: number): Promise<CardBrief[]> {
  const res = await fetch(`${API_BASE}/cards?dexId=eq:${dexId}`);
  if (!res.ok) {
    throw new Error(`TCGdex dexId lookup failed: ${res.status}`);
  }
  return res.json();
}

export async function getCard(id: string): Promise<CardFull> {
  const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`TCGdex card lookup failed: ${res.status}`);
  }
  return res.json();
}

let setsPromise: Promise<SetBrief[]> | null = null;

export function getSets(): Promise<SetBrief[]> {
  if (!setsPromise) {
    setsPromise = fetch(`${API_BASE}/sets`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`TCGdex sets lookup failed: ${res.status}`);
        }
        return res.json();
      })
      .catch((e) => {
        setsPromise = null;
        throw e;
      });
  }
  return setsPromise;
}

export function setIdFromCardId(cardId: string, localId: string): string {
  return cardId.slice(0, cardId.length - localId.length - 1);
}
