# LØFT — Treningsapp

Expo SDK 57 / React Native 0.86 / expo-router v6 / TypeScript strict. Versjonerte docs: https://docs.expo.dev/versions/v57.0.0/

Lokal-først treningslogg for web, iOS og Android. **Ingen backend, ingen fiktive data** — alt lagres på enheten (AsyncStorage/localStorage). Web-versjonen deployes til GitHub Pages fra `dist/` (`npx expo export --platform web`; `experiments.baseUrl` = `/Treningsapp`).

## Regler

- All brukersynlig tekst på **norsk (bokmål)**. Kodeidentifikatorer på engelsk.
- **Aldri hardkod farger** — alt via `useTheme()` fra `@/theme` (mørk er standard). Grafserier/heatmap: `chartSeries`/`heatmapRamp` fra `@/theme`.
- Path-alias `@/*` → `./src/*`.
- Native header er av (`headerShown: false`) — skjermer bruker `<Screen>` + `<ScreenHeader>` fra `@/components/ui`.
- Tilstand: zustand-stores i `src/lib/store/` (persistert med AsyncStorage). Ren logikk (1RM, PR, poeng, streaks, badges) hører hjemme i `src/lib/logic/` som rene funksjoner.
- Norsk formatering av tall/dato: bruk hjelperne i `src/lib/format.ts` (`formatKg`, `formatVolume`, `formatRelativeDate`, ...).
- Nye ruter må registreres i `src/app/_layout.tsx` (root Stack).
- Grafer: egne SVG-komponenter i `@/components/charts` — ikke dra inn chart-biblioteker.
- Typecheck: `npx tsc --noEmit` skal være grønt.

## Bevisste valg

- **Ikke gjeninnfør simulerte/fiktive brukere eller venner** — brukeren har eksplisitt fjernet dette. Datamodellen (`src/types/`) beholder felter for deling/likes/kommentarer/deltakere til en EKTE backend kobles på, men UI eksponerer dem ikke.
- Utfordringer (`challenges`) er personlige mål med `target`-verdi, ikke konkurranser mot andre.
- Øvelsesdatabasen (192 stk) ligger i `lib/data/exercises.ts`; id-ene er API — ikke endre eksisterende id-er.
