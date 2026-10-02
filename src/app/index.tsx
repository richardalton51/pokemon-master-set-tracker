import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { PokedexEntry } from '@/data/pokedex';
import { usePokedex } from '@/lib/pokedex';
import { cardImageUrl } from '@/lib/tcgdex';
import { useCollection } from '@/lib/collection';
import { useThemeColors } from '@/lib/theme';

export default function MasterListScreen() {
  const router = useRouter();
  const { collection, toggleOwned } = useCollection();
  const [query, setQuery] = useState('');
  const colors = useThemeColors();
  const pokedex = usePokedex();

  const data = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return pokedex;
    return pokedex.filter(
      (entry) => entry.name.toLowerCase().includes(trimmed) || String(entry.id).includes(trimmed),
    );
  }, [pokedex, query]);

  const renderItem = ({ item }: { item: PokedexEntry }) => {
    const entry = collection[item.id];
    const image = entry?.card?.image;

    return (
      <Pressable style={styles.row} onPress={() => router.push(`/card/${item.id}`)}>
        <Pressable
          style={[
            styles.checkbox,
            { borderColor: colors.textMuted },
            entry?.owned && { backgroundColor: colors.accent, borderColor: colors.accent },
          ]}
          onPress={() => toggleOwned(item.id)}
          hitSlop={8}
        >
          {entry?.owned && <Text style={[styles.checkmark, { color: colors.accentText }]}>✓</Text>}
        </Pressable>

        {image ? (
          <Image source={{ uri: cardImageUrl(image, 'low') }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.placeholder }]} />
        )}

        <View style={styles.info}>
          <Text style={[styles.dexNumber, { color: colors.textMuted }]}>
            #{String(item.id).padStart(4, '0')}
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          {entry?.card?.setName && (
            <Text style={[styles.setName, { color: colors.textMuted }]}>{entry.card.setName}</Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.title, { color: colors.text }]}>Pokédex</Text>
      <TextInput
        style={[styles.search, { borderColor: colors.border, color: colors.text }]}
        placeholder="Search by name or number"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        initialNumToRender={20}
        windowSize={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 12,
  },
  search: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontWeight: '700',
  },
  thumb: {
    width: 48,
    height: 67,
    borderRadius: 4,
  },
  info: {
    flex: 1,
  },
  dexNumber: {
    fontSize: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  setName: {
    fontSize: 12,
  },
});
