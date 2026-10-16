import { useEffect, useState } from 'react';
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

import { OnePiecePrinting, useOnePieceCatalog } from '@/lib/optcg';
import { SelectedCard, useCollection } from '@/lib/collection';
import { useThemeColors } from '@/lib/theme';
import { getUsdToGbpRate } from '@/lib/fx';

function formatGbp(usd: number | null | undefined, rate: number | null): string {
  return usd == null || rate == null ? '—' : `£${(usd * rate).toFixed(2)}`;
}

export default function OnePieceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { catalog, error } = useOnePieceCatalog();
  const { collection, toggleOwned, setSelectedCard } = useCollection();
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [rate, setRate] = useState<number | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUsdToGbpRate()
      .then((r) => {
        if (!cancelled) setRate(r);
      })
      .catch((e) => {
        if (!cancelled) setRateError(e instanceof Error ? e.message : 'Failed to load exchange rate');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entry = collection[id];
  const printings = catalog?.printingsById.get(id) ?? null;
  const baseName = catalog?.entries.find((e) => e.id === id)?.name;
  const selected = printings?.find((p) => p.key === entry?.card?.id);

  const trimmedQuery = query.trim().toLowerCase();
  const filteredPrintings = trimmedQuery
    ? printings?.filter(
        (p) =>
          p.setName.toLowerCase().includes(trimmedQuery) ||
          p.name.toLowerCase().includes(trimmedQuery) ||
          p.cardId.toLowerCase().includes(trimmedQuery),
      )
    : printings;

  const handleSelect = (printing: OnePiecePrinting) => {
    const card: SelectedCard = {
      id: printing.key,
      name: printing.name,
      image: printing.image,
      setId: printing.setId,
      setName: printing.setName,
    };
    setSelectedCard(id, card);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: baseName ?? 'One Piece' }} />

      <View style={styles.preview}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={[styles.number, { color: colors.textMuted }]}>
              {printings ? `${printings.length} printings` : ''}
            </Text>
            <Text style={[styles.name, { color: colors.text }]}>{baseName}</Text>
          </View>
          <Pressable
            style={[
              styles.checkbox,
              { borderColor: colors.textMuted },
              entry?.owned && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => toggleOwned(id)}
            hitSlop={8}
          >
            {entry?.owned && <Text style={[styles.checkmark, { color: colors.accentText }]}>✓</Text>}
          </Pressable>
        </View>

        {entry?.card?.image ? (
          <Image
            source={{ uri: entry.card.image }}
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

        {selected && (
          <View style={[styles.pricing, { borderColor: colors.border }]}>
            {rateError && <Text style={{ color: colors.error }}>{rateError}</Text>}
            <View style={styles.pricingRow}>
              <View style={styles.pricingItem}>
                <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>Market</Text>
                <Text style={[styles.pricingValue, { color: colors.text }]}>
                  {formatGbp(selected.market, rate)}
                </Text>
              </View>
              <View style={styles.pricingItem}>
                <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>Inventory</Text>
                <Text style={[styles.pricingValue, { color: colors.text }]}>
                  {formatGbp(selected.inventory, rate)}
                </Text>
              </View>
              <View style={styles.pricingItem}>
                <Text style={[styles.pricingLabel, { color: colors.textMuted }]}>Rarity</Text>
                <Text style={[styles.pricingValue, { color: colors.text }]}>{selected.rarity}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.sets, { borderTopColor: colors.border }]}>
        {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
        {!catalog && !error && <ActivityIndicator style={styles.spacing} />}

        {printings && (
          <TextInput
            style={[styles.search, { borderColor: colors.border, color: colors.text }]}
            placeholder="Filter by set, card number or variant"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        <FlatList
          data={filteredPrintings ?? []}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            catalog ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {printings && printings.length > 0
                  ? 'No printings match your search.'
                  : 'No printings found for this card.'}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const isSelected = entry?.card?.id === item.key;
            return (
              <Pressable
                style={[styles.row, isSelected && { backgroundColor: colors.selectedRow }]}
                onPress={() => handleSelect(item)}
              >
                <Image source={{ uri: item.image }} style={styles.thumb} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.setName, { color: colors.textMuted }]}>{item.setName}</Text>
                  <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.setName, { color: colors.textMuted }]}>
                    {item.cardId} · {item.rarity} · {formatGbp(item.market, rate)}
                  </Text>
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
  number: {
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
