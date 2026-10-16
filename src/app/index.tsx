import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { usePokedex } from '@/lib/pokedex';
import { useOnePieceCatalog } from '@/lib/optcg';
import { cardImageUrl } from '@/lib/tcgdex';
import { useCollection } from '@/lib/collection';
import { useThemeColors } from '@/lib/theme';

type Game = 'pokemon' | 'onepiece';

const GAMES: { key: Game; label: string; title: string }[] = [
  { key: 'pokemon', label: 'Pokémon', title: 'Pokédex' },
  { key: 'onepiece', label: 'One Piece', title: 'One Piece Cards' },
];

type ListItem = {
  key: string;
  number: string;
  name: string;
  href: string;
};

export default function MasterListScreen() {
  const router = useRouter();
  const { collection, toggleOwned } = useCollection();
  const [query, setQuery] = useState('');
  const [game, setGame] = useState<Game>('pokemon');
  const colors = useThemeColors();
  const pokedex = usePokedex();
  const { catalog: onePiece, error: onePieceError } = useOnePieceCatalog();

  const items = useMemo<ListItem[]>(() => {
    if (game === 'pokemon') {
      return pokedex.map((p) => ({
        key: String(p.id),
        number: `#${String(p.id).padStart(4, '0')}`,
        name: p.name,
        href: `/card/${p.id}`,
      }));
    }
    return (onePiece?.entries ?? []).map((c) => ({
      key: c.id,
      number: `${c.printingCount} ${c.printingCount === 1 ? 'card' : 'cards'}`,
      name: c.name,
      href: `/onepiece/${c.id}`,
    }));
  }, [game, pokedex, onePiece]);

  const data = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return items;
    return items.filter(
      (item) => item.name.toLowerCase().includes(trimmed) || item.number.toLowerCase().includes(trimmed),
    );
  }, [items, query]);

  const thumbnailUri = (image: string) => (game === 'pokemon' ? cardImageUrl(image, 'low') : image);

  const renderItem = ({ item }: { item: ListItem }) => {
    const entry = collection[item.key];
    const image = entry?.card?.image;

    return (
      <Pressable style={styles.row} onPress={() => router.push(item.href as never)}>
        <Pressable
          style={[
            styles.checkbox,
            { borderColor: colors.textMuted },
            entry?.owned && { backgroundColor: colors.accent, borderColor: colors.accent },
          ]}
          onPress={() => toggleOwned(item.key)}
          hitSlop={8}
        >
          {entry?.owned && <Text style={[styles.checkmark, { color: colors.accentText }]}>✓</Text>}
        </Pressable>

        {image ? (
          <Image source={{ uri: thumbnailUri(image) }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.placeholder }]} />
        )}

        <View style={styles.info}>
          <Text style={[styles.dexNumber, { color: colors.textMuted }]}>{item.number}</Text>
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
      <View style={[styles.switcher, { borderColor: colors.border }]}>
        {GAMES.map((g) => (
          <Pressable
            key={g.key}
            style={[styles.switcherOption, game === g.key && { backgroundColor: colors.accent }]}
            onPress={() => setGame(g.key)}
          >
            <Text
              style={[
                styles.switcherLabel,
                { color: game === g.key ? colors.accentText : colors.text },
              ]}
            >
              {g.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        {GAMES.find((g) => g.key === game)?.title}
      </Text>
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
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        initialNumToRender={20}
        windowSize={10}
        ListEmptyComponent={
          game === 'onepiece' && !onePiece ? (
            onePieceError ? (
              <Text style={[styles.status, { color: colors.error }]}>{onePieceError}</Text>
            ) : (
              <ActivityIndicator style={styles.status} />
            )
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  switcher: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 12,
  },
  switcherOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  switcherLabel: {
    fontWeight: '600',
  },
  status: {
    marginTop: 40,
    textAlign: 'center',
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
