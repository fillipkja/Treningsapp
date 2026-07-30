// Etterbehandling av `expo export --platform web`:
// - Injiserer PWA-tagger i <head> (apple-touch-icon, manifest, theme-color) —
//   Expo genererer ikke disse selv, og med web.output 'single' finnes ingen
//   +html.tsx-krok. Uten apple-touch-icon viser iOS bare en bokstavflis («L»)
//   når appen legges på hjemskjermen; uten manifest/-capable-metaer åpner
//   bokmerket i Safari med nettleser-krom i stedet for standalone.
// - Utvider viewport-metaen med viewport-fit=cover — kreves for at
//   env(safe-area-inset-*) blir > 0 i standalone (safe-area-context på web
//   plukker dem opp automatisk).
// - Setter mørk bakgrunn på html/body så oppstart og overscroll ikke blinker hvitt.
// - Kopierer index.html til 404.html (SPA-fallback for GitHub Pages) og
//   skriver .nojekyll — tidligere gjort for hånd.
// Ikonene og manifestet ligger i public/ og kopieres automatisk til dist/ av
// expo export. Kjør: node scripts/postexport.mjs

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const distPath = (file) => fileURLToPath(new URL(`../dist/${file}`, import.meta.url));

// Stopp før et halvt artefakt kan publiseres (gh-pages-deployen i juli 2026
// manglet både ikoner og manifest fordi eksporten skjedde uten public/)
for (const required of ['manifest.webmanifest', 'icons/icon-180.png']) {
  if (!existsSync(distPath(required))) {
    throw new Error(`dist/${required} mangler — kjørte expo export riktig?`);
  }
}

const tags = [
  '<link rel="apple-touch-icon" sizes="180x180" href="/Treningsapp/icons/icon-180.png"/>',
  '<link rel="manifest" href="/Treningsapp/manifest.webmanifest"/>',
  '<meta name="theme-color" content="#0d0d0d"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-title" content="LØFT"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>',
  '<style>html,body{background-color:#0d0d0d}</style>',
  // WebKit-feil 254868: i standalone-PWA med viewport-fit=cover er layout-viewporten
  // (dermed expo-resetens height:100 %, samt 100svh/100dvh/-webkit-fill-available)
  // ~34px for kort i bunnen (hjemindikatoren) — kun 100vh når hele skjermen.
  // Må scopes til standalone: i vanlig Safari-fane er 100vh største viewport, og med
  // body{overflow:hidden} ville fanelinjen havne bak verktøylinjen. html.standalone
  // er fallback for eldre iOS uten display-mode-støtte (navigator.standalone).
  '<style>@media (display-mode: standalone), (display-mode: fullscreen){html,body{height:100vh}}html.standalone,html.standalone body{height:100vh}</style>',
  '<script>if(navigator.standalone)document.documentElement.classList.add("standalone")</script>',
].join('');

let html = readFileSync(distPath('index.html'), 'utf8');
if (!html.includes('</head>')) {
  throw new Error('dist/index.html mangler </head> — kjørte expo export riktig?');
}
const viewport = 'width=device-width, initial-scale=1, shrink-to-fit=no';
if (!html.includes(viewport)) {
  throw new Error('dist/index.html mangler forventet viewport-meta — Expo endret malen?');
}
html = html.replace(viewport, `${viewport}, viewport-fit=cover`);
writeFileSync(distPath('index.html'), html.replace('</head>', `${tags}</head>`));
copyFileSync(distPath('index.html'), distPath('404.html'));
writeFileSync(distPath('.nojekyll'), '');

console.log('postexport: PWA-tagger injisert, 404.html og .nojekyll skrevet');
