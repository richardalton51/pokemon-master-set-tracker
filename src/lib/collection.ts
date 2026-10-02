import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext } from 'react';

const STORAGE_KEY = 'pokemon-collection:v1';
const PERSIST_DEBOUNCE_MS = 300;

export type SelectedCard = {
  id: string;
  name: string;
  image?: string;
  setId: string;
  setName: string;
};

export type CollectionEntry = {
  owned: boolean;
  card?: SelectedCard;
};

export type Collection = Record<number, CollectionEntry>;

export async function loadCollection(): Promise<Collection> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

let pendingWrite: Collection | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

export function persistCollection(collection: Collection) {
  pendingWrite = collection;
  if (writeTimer) {
    clearTimeout(writeTimer);
  }
  writeTimer = setTimeout(() => {
    if (pendingWrite) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pendingWrite));
    }
    writeTimer = null;
  }, PERSIST_DEBOUNCE_MS);
}

export type CollectionContextValue = {
  collection: Collection;
  loaded: boolean;
  toggleOwned: (dexId: number) => void;
  setSelectedCard: (dexId: number, card: SelectedCard) => void;
};

export const CollectionContext = createContext<CollectionContextValue | null>(null);

export function useCollection(): CollectionContextValue {
  const ctx = useContext(CollectionContext);
  if (!ctx) {
    throw new Error('useCollection must be used within a CollectionProvider');
  }
  return ctx;
}
