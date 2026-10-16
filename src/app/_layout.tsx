import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import {
  Collection,
  CollectionContext,
  CollectionKey,
  CollectionContextValue,
  SelectedCard,
  loadCollection,
  persistCollection,
} from '@/lib/collection';
import { useThemeColors } from '@/lib/theme';

export default function RootLayout() {
  const colors = useThemeColors();
  const [collection, setCollection] = useState<Collection>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadCollection().then((stored) => {
      setCollection(stored);
      setLoaded(true);
    });
  }, []);

  const toggleOwned = useCallback((key: CollectionKey) => {
    setCollection((prev) => {
      const next: Collection = {
        ...prev,
        [key]: { ...prev[key], owned: !prev[key]?.owned },
      };
      persistCollection(next);
      return next;
    });
  }, []);

  const setSelectedCard = useCallback((key: CollectionKey, card: SelectedCard) => {
    setCollection((prev) => {
      const next: Collection = {
        ...prev,
        [key]: { owned: prev[key]?.owned ?? false, card },
      };
      persistCollection(next);
      return next;
    });
  }, []);

  const value = useMemo<CollectionContextValue>(
    () => ({ collection, loaded, toggleOwned, setSelectedCard }),
    [collection, loaded, toggleOwned, setSelectedCard],
  );

  return (
    <CollectionContext.Provider value={value}>
      <Stack
        screenOptions={{
          title: 'Master Set Tracker',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <StatusBar style="light" />
    </CollectionContext.Provider>
  );
}
