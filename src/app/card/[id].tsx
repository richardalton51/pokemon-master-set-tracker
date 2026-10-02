import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { usePokedex } from '@/lib/pokedex';
import {
  CardMarketPricing,
  cardImageUrl,
  getCard,
  getCardsByDexId,
  getSets,
  setIdFromCardId,
} from '@/lib/tcgdex';
import { useCollection, SelectedCard } from '@/lib/collection';
import { useThemeColors } from '@/lib/theme';
import { getEurToGbpRate } from '@/lib/fx';

type PrintingRow = {
  cardId: string;
  name: string;
  image?: string;
  setId: string;
  setName: string;
  setLogo?: string;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

function formatPrice(value: number | undefined, unit: string | undefined): string {
  if (value === undefined) return '—';
  const symbol = unit ? (CURRENCY_SYMBOLS[unit] ?? `${unit} `) : '';
  return `${symbol}${value.toFixed(2)}`;
}

export default function PokemonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dexId = Number(id);
  const pokedex = usePokedex();
  const pokedexEntry = useMemo(() => pokedex.find((p) => p.id === dexId), [pokedex, dexId]);
  const { collection, toggleOwned, setSelectedCard } = useCollection();
  const entry = collection[dexId];
  const colors = useThemeColors();

  const [result, setResult] = useState<{ dexId: number; printings: PrintingRow[] } | null>(null);
  const [error, setError] = useState<{ dexId: number; message: string } | null>(null);
  const [query, setQuery] = useState('');

  const selectedCardId = entry?.card?.id;
  const [pricing, setPricing] = useState<{ cardId: string; data: CardMarketPricing | null } | null>(
    null,
  );
  const [pricingError, setPricingError] = useState<{ cardId: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([getCardsByDexId(dexId), getSets()])
      .then(([cards, sets]) => {
        if (cancelled) return;
        const setsById = new Map(sets.map((s) => [s.id, s]));
        const rows: PrintingRow[] = cards.map((card) => {
          const setId = setIdFromCardId(card.id, card.localId);
          const set = setsById.get(setId);
          return {
            cardId: card.id,
            name: card.name,
            image: card.image,
            setId,
            setName: set?.name ?? setId,
            setLogo: set?.logo,
          };
        });
        rows.sort((a, b) => a.setId.localeCompare(b.setId));
        setResult({ dexId, printings: rows });
      })
      .catch((e) => {
        if (!cancelled) {
          setError({ dexId, message: e instanceof Error ? e.message : 'Failed to load sets' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dexId]);

  useEffect(() => {
    if (!selectedCardId) return;
    let cancelled = false;

    Promise.all([getCard(selectedCardId), getEurToGbpRate()])
      .then(([card, eurToGbpRate]) => {
        if (cancelled) return;
        const cardmarket = card.pricing?.cardmarket;
        if (!cardmarket) {
          setPricing({ cardId: selectedCardId, data: null });
          return;
        }
        const rate = cardmarket.unit === 'GBP' ? 1 : eurToGbpRate;
        setPricing({
          cardId: selectedCardId,
          data: {
            unit: 'GBP',
            updated: cardmarket.updated,
            avg: cardmarket.avg !== undefined ? cardmarket.avg * rate : undefined,
            low: cardmarket.low !== undefined ? cardmarket.low * rate : undefined,
            trend: cardmarket.trend !== undefined ? cardmarket.trend * rate : undefined,
          },
        });
      })
      .catch((e) => {
        if (!cancelled) {
          setPricingError({
            cardId: selectedCardId,
            message: e instanceof Error ? e.message : 'Failed to load pricing',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCardId]);

  const printings = result?.dexId === dexId ? result.printings : null;
  const loadError = error?.dexId === dexId ? error.message : null;

  const filteredPrintings = useMemo(() => {
    if (!printings) return printings;
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return printings;
    return printings.filter((row) => row.setName.toLowerCase().includes(trimmed));
  }, [printings, query]);

  const cardPricing = pricing && pricing.cardId === selectedCardId ? pricing.data : null;
  const cardPricingError =
    pricingError && pricingError.cardId === selectedCardId ? pricingError.message : null;
  const pricingLoading = Boolean(selectedCardId) && pricing?.cardId !== selectedCardId && !cardPricingError;

  const handleSelect = (row: PrintingRow) => {
    const card: SelectedCard = {
      id: row.cardId,
      name: row.name,
      image: row.image,
      setId: row.setId,
      setName: row.setName,
    };
    setSelectedCard(dexId, card);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: pokedexEntry?.name ?? 'Pokémon' }} />

      <View style={styles.preview}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={[styles.dexNumber, { color: colors.textMuted }]}>
              #{String(dexId).padStart(4, '0')}
            </Text>
            <Text style={[styles.name, { color: colors.text }]}>{pokedexEntry?.name}</Text>
          </View>
          <Pressable
            style={[
              styles.checkbox,
              { borderColor: colors.textMuted },
              entry?.owned && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => toggleOwned(dexId)}
            hitSlop={8}
          >
            {entry?.owned && <Text style={[styles.checkmark, { color: colors.accentText }]}>✓</Text>}
          </Pressable>
        </View>

        {entry?.card?.image ? (
          <Image
            source={{ uri: cardImageUrl(entry.card.image, 'high') }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.previewImage, styles.previewPlaceholder, { backgroundColor: colors.placeholder }]}>
            <Text style={[styles.previewPlaceholderText, { color: colors.textMuted }]}>
              Pick a printing below to set your preview
            </Text>
          </View>
        )}

        {entry?.card && (
          <View style={[styles.pricing, { borderColor: colors.border }]}>
            {pricingLoading && <ActivityIndicator />}
            {cardPricingError && <Text style={{ color: colors.error }}>{cardPricingError}</Text>}
            {!pricingLoading && !cardPricingError && !cardPricing && (
              <Text style={{ color: colors.textMuted }}>No pricing data available.</Text>
            )}
            {cardPricing && (
              <View style={styles.pricingRow}>
                <View style={styles.pricingItem}>
                  <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>Average</Text>
                  <Text style={[styles.pricingValue, { color: colors.text }]}>
                    {formatPrice(cardPricing.avg, cardPricing.unit)}
                  </Text>
                </View>
                <View style={styles.pricingItem}>
                  <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>Low</Text>
                  <Text style={[styles.pricingValue, { color: colors.text }]}>
                    {formatPrice(cardPricing.low, cardPricing.unit)}
                  </Text>
                </View>
                <View style={styles.pricingItem}>
                  <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>Trend</Text>
                  <Text style={[styles.pricingValue, { color: colors.text }]}>
                    {formatPrice(cardPricing.trend, cardPricing.unit)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={[styles.sets, { borderTopColor: colors.border }]}>
        {loadError && <Text style={[styles.error, { color: colors.error }]}>{loadError}</Text>}
        {!printings && !loadError && <ActivityIndicator style={styles.spacing} />}

        {printings && (
          <TextInput
            style={[styles.search, { borderColor: colors.border, color: colors.text }]}
            placeholder="Filter by set name"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        <FlatList
          data={filteredPrintings ?? []}
          keyExtractor={(item) => item.cardId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            filteredPrintings && filteredPrintings.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {printings && printings.length > 0
                  ? 'No sets match your search.'
                  : 'No cards found for this Pokémon.'}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const isSelected = entry?.card?.id === item.cardId;
            return (
              <Pressable
                style={[styles.row, isSelected && { backgroundColor: colors.selectedRow }]}
                onPress={() => handleSelect(item)}
              >
                {item.image ? (
                  <Image source={{ uri: cardImageUrl(item.image, 'low') }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: colors.placeholder }]} />
                )}
                <View style={styles.rowInfo}>
                  <Text style={[styles.setName, { color: colors.textMuted }]}>{item.setName}</Text>
                  <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                </View>
                {isSelected && <Text style={[styles.selectedMark, { color: colors.accent }]}>✓</Text>}
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  preview: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
  },
  dexNumber: {
    fontSize: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 260,
    borderRadius: 8,
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  previewPlaceholderText: {
    textAlign: 'center',
  },
  pricing: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pricingItem: {
    alignItems: 'center',
    flex: 1,
  },
  pricingLabel: {
    fontSize: 12,
  },
  pricingValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  sets: {
    flex: 1,
    borderTopWidth: 1,
  },
  spacing: {
    marginTop: 40,
  },
  error: {
    padding: 16,
  },
  search: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 16,
    marginBottom: 0,
  },
  list: {
    padding: 16,
    gap: 4,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  thumb: {
    width: 48,
    height: 67,
    borderRadius: 4,
  },
  rowInfo: {
    flex: 1,
  },
  setName: {
    fontSize: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedMark: {
    fontSize: 18,
    fontWeight: '700',
  },
});
