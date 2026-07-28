# LØFT 🏋️

«Strava for styrketrening» — logg økter, følg venners trening, konkurrer på ukentlige rangeringer og lås opp merker. Bygget med **Expo (React Native) + TypeScript** og kjører på **web, iOS og Android** fra samme kodebase. Mørkt premium-design som standard.

**Ekte flerbruker:** kontoer med e-post/passord, venner, feed, likes, kommentarer og konkurranser — alt lagret i Postgres (Supabase) med row-level security. Udelte økter er usynlige for alle andre, håndhevet av databasen selv.

## Bruk den

- **Web:** https://fillipkja.github.io/Treningsapp/
- **Lokalt:**

```bash
npm install
npx expo start        # trykk w (web), i (iOS-simulator) eller a (Android)
```

## Funksjoner

**Logging**
- Aktiv økt med live-timer, sett/reps/vekt/RPE, oppvarmingssett og hviletimer
- Automatisk PR-deteksjon (beste vekt og estimert 1RM via Epley) med feiring
- Egne treningsprogrammer (flere dager) og favorittøkter som startes med ett trykk
- Øvelsesdatabase med 190+ øvelser (norske navn, instruksjoner, tips) + egne øvelser

**Statistikk**
- Volum- og styrkeutvikling som linjegrafer, økter per uke som stolpediagram
- Aktivitetskalender (heatmap), streak-teller, favorittøvelser
- Personlige rekorder per øvelse med historikk

**Mål og merker**
- Poengsystem per uke/måned (50 p/økt + 1 p/100 kg volum + 25 p/PR)
- Personlige utfordringer: antall økter, volum, rekorder eller fullfør et program innen en frist
- 24 merker (bronse/sølv/gull) for milepæler som «100 økter», «180 kg knebøy» og «30 dager på rad»

## Arkitektur

```
src/
├── app/                  # Skjermer (expo-router, filbasert ruting)
│   ├── (auth)/           # Velkomst + profiloppsett
│   ├── (tabs)/           # Hjem, Trening, Statistikk, Mål, Profil
│   ├── workout/          # Aktiv økt + øktdetalj
│   ├── exercises/        # Øvelsesbibliotek, detalj, ny øvelse
│   ├── programs/         # Programdetalj + bygger
│   ├── challenges/       # Personlige utfordringer
│   └── settings/         # Innstillinger, rediger profil
├── components/
│   ├── ui/               # Designsystem (Button, Card, Sheet, ...)
│   ├── charts/           # Egne SVG-grafer (LineChart, BarChart, heatmap, StatTile)
│   ├── workout/          # WorkoutCard, hviletimer, øvelses-editor
│   └── exercises/        # ExercisePickerSheet
├── lib/
│   ├── store/            # Zustand-stores m/ AsyncStorage-persistering
│   ├── logic/            # Ren forretningslogikk (1RM, PR, poeng, streaks, badges)
│   ├── data/             # Øvelsesdatabasen
│   └── format.ts         # Norsk formatering av tall/datoer
├── theme/                # Fargetokens (mørk/lys), spacing, typografi
└── types/                # Domenemodellen
```

## Deploy av web-versjonen

```bash
npx expo export --platform web   # bygger til dist/
```

`dist/` publiseres til GitHub Pages (gh-pages-branch). `experiments.baseUrl` i app.json er satt til `/Treningsapp` for å matche repo-navnet.

## Backend

Supabase (Postgres + Auth). Hele skjemaet ligger i `supabase/migrations/0001_init.sql`: tabeller, row-level security-policyer, varsel-triggere og RPC-er (`friend_leaderboard`, `challenge_standings`). Varsler kan kun opprettes av databasetriggere — aldri av klienter. Aggregater (volum/sett/PR-er) beregnes av databasen fra settene, så rangeringer kan ikke jukses.

Integrasjonstester (16 stk, inkl. angrepsscenarier mot RLS): `SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/integration-test.mjs`

Frontend-hemmeligheter: kun `EXPO_PUBLIC_SUPABASE_URL` og `EXPO_PUBLIC_SUPABASE_ANON_KEY` i `.env` — anon-nøkkelen er offentlig per design (RLS beskytter dataene). `service_role`-nøkkelen skal ALDRI i klientkode eller repo.

Native app-lansering til App Store/Google Play gjøres med EAS (`eas.json` ligger klar).
