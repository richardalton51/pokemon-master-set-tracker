import AsyncStorage from '@react-native-async-storage/async-storage';

type Currency = 'EUR' | 'USD';

const fxApi = (from: Currency) => `https://api.frankfurter.app/latest?from=${from}&to=GBP`;
const cacheKey = (from: Currency) => `fx-rate-${from.toLowerCase()}-gbp:v1`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Cache = { rate: number; fetchedAt: number };

async function readCache(from: Currency): Promise<Cache | null> {
  const raw = await AsyncStorage.getItem(cacheKey(from));
  return raw ? JSON.parse(raw) : null;
}

async function writeCache(from: Currency, rate: number): Promise<void> {
  const cache: Cache = { rate, fetchedAt: Date.now() };
  await AsyncStorage.setItem(cacheKey(from), JSON.stringify(cache));
}

async function fetchRate(from: Currency): Promise<number> {
  const res = await fetch(fxApi(from));
  if (!res.ok) {
    throw new Error(`Exchange rate lookup failed: ${res.status}`);
  }
  const data = await res.json();
  const rate = data?.rates?.GBP;
  if (typeof rate !== 'number') {
    throw new Error('Exchange rate unavailable');
  }
  return rate;
}

const ratePromises: Partial<Record<Currency, Promise<number>>> = {};

function getRateToGbp(from: Currency): Promise<number> {
  if (!ratePromises[from]) {
    ratePromises[from] = (async () => {
      const cached = await readCache(from);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.rate;
      }

      try {
        const rate = await fetchRate(from);
        await writeCache(from, rate);
        return rate;
      } catch (e) {
        if (cached) return cached.rate;
        throw e;
      }
    })().catch((e) => {
      delete ratePromises[from];
      throw e;
    });
  }
  return ratePromises[from]!;
}

export const getEurToGbpRate = () => getRateToGbp('EUR');
export const getUsdToGbpRate = () => getRateToGbp('USD');
