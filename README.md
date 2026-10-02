# Pokémon Master Set Tracker

A mobile app for tracking a Pokémon TCG master set — every National Dex species in one
checklist, with the specific card printing and pricing you care about front and centre.

## What it does

- **Master checklist** — every Pokémon species, tick the ones you own.
- **Pick your printing** — tap into a Pokémon to see a scrollable list of every set
  it's been printed in (via [TCGdex](https://tcgdex.dev/)), filterable by set name.
  Choose a printing to represent that Pokémon on the main list.
- **Pricing** — once you've picked a printing, see its Cardmarket average, low, and
  trend price, converted from EUR to GBP.
- **Works offline** — owned/selected state is stored on-device (AsyncStorage); no
  account or backend required.
- **Dark mode** — the only mode.

## How the Pokédex list stays current

The master list of species (`src/data/pokedex.ts`) is bundled with the app rather than
fetched live, so dex numbers stay stable release to release. At runtime, the app
still checks [PokeAPI](https://pokeapi.co/) in the background (once a day, cached via
AsyncStorage) for species not yet in the bundled file and appends any it finds — so a
new generation shows up before the next app update ships one. See
`scripts/generate-pokedex.mjs` for how the bundled file itself gets regenerated
(matches existing Pokémon by name to keep their id, appends anything new).

## Tech stack

- [Expo](https://expo.dev/) + [Expo Router](https://docs.expo.dev/router/introduction/)
  (file-based routing, screens under `src/app/`)
- React Native, TypeScript
- [TCGdex API](https://tcgdex.dev/) for card/set data and images
- [PokeAPI](https://pokeapi.co/) for the species list
- [Frankfurter](https://frankfurter.dev/) for EUR→GBP exchange rates
- `@react-native-async-storage/async-storage` for local persistence

## Getting started

```bash
npm install
npx expo start
```

Then press `i` for iOS Simulator, `a` for Android emulator, `w` for web, or scan the
QR code with Expo Go on a physical device.

## Useful commands

```bash
npx expo lint               # lint
npx tsc --noEmit             # typecheck
npx expo-doctor              # diagnose dependency/config issues
npx expo install --fix       # fix incompatible package versions
node scripts/generate-pokedex.mjs  # regenerate src/data/pokedex.ts from PokeAPI
```
