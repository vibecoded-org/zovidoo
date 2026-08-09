# Zovidoo — musical ear training

Zovidoo is a mobile-first Ionic/Angular app for short, focused practice in note, interval, chord and progression recognition. It works fully offline after the app bundle is available; audio is synthesized locally.

## Technology

- Angular 20, Ionic 8 and Capacitor 8
- Tone.js for a single shared polyphonic synth and scheduled playback
- Tonal for pitch/chord normalization and chord-note generation
- Angular signals plus a namespaced `localStorage` repository

## Architecture

`src/app/core` contains audio, music theory, exercise generation, session orchestration, progress aggregation, notifications and persistence. `features` only presents these services. `shared` contains the answer interfaces and bottom navigation.

Exercise generation is deterministic when supplied a random function and always produces intentional unique distractors. Sessions store only compact summaries; raw Tone nodes and audio are never persisted.

Exercise behavior and musical pools are configured in `src/app/core/exercise-catalog.config.ts`. See [the exercise configuration guide](docs/exercise-configuration.md) to tune difficulty, choices, content pools or add a generator.

## Storage schema

All data is stored under `zovidoo-ear-training` as:

```json
{ "version": 3, "profile": { "name": "…", "createdAt": "…" }, "settings": {}, "sessions": [], "skillProgress": {} }
```

The export wrapper includes `app`, `schemaVersion`, `exportedAt`, and `data`. Schemas 1 and 2 are migrated safely to schema 3; imports validate their exercise types, numeric limits and dates before replacing any local state. Each skill retains a local score (0–100), level (1–5), recent first-attempt results and last-update timestamp.

## Run and build

```bash
bun install
bun run start
bun run build
bun run test
```

## PWA installation

The production build registers Angular's service worker, caches the application shell and exposes an install manifest with Android and iOS icon sizes. Deploy the `www` folder over HTTPS (or use `localhost` during development).

- Android/Chrome: open the site menu and choose **Install app**.
- iPhone/iPad Safari: use **Share → Add to Home Screen**.

The app is available offline after its first successful production visit. A local development server intentionally does not register the service worker.

For native shells, install the platform then sync the built `www` folder with Capacitor, for example `npx cap add android` followed by `npx cap sync`.

## Known MVP boundaries

Browser reminders only fire while Zovidoo remains open; background scheduling needs Web Push or a native notification plugin and is intentionally not presented as guaranteed. The adaptive curriculum covers melodic and harmonic intervals, chord inversions, cadences and rhythm patterns through per-skill mastery. Sample packs, accounts and sync remain future work.
