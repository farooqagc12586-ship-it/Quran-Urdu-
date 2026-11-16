# Al-Bayan Holy Quran — Word-by-Word Synchronized Application

An interactive, mobile-first Progressive Web App (PWA) for reading and listening to the Noble Quran with real-time synchronized word-by-word highlighting recited by **Sheikh Fares Abbad (فارس عباد)** and Urdu translation audio by **Shamshad Ali Khan (شمشاد علی خان)**.

## Architecture & Data Sources

- **Verified Quranic Text & Tajweed**: Uthmani script (preserving all Harakat and spelling) and verified Tajweed rule markup (`text_uthmani_tajweed`) sourced from **Quran.com API v4** (King Fahd Glorious Quran Printing Complex / Tanzil Uthmani).
- **Translations & Word-by-Word Meanings**:
  - **Urdu Ayah Translation**: Complete 114-Surah, 6,236-Ayah verified translation by **Maulana Fateh Muhammad Jalandhri (مولانا فتح محمد جالندھری)** (default, `public/data/jalandhariUrdu.json`, AlQuran.cloud `ur.jalandhry` / Quran.com resource #234) alongside **Maulana Muhammad Junagarhi (مولانا محمد جوناگڑھی)** (`public/data/junagarhiUrdu.json`, `ur.junagarhi` / #54), displayed in **Jameel Noori Nastaleeq Regular** (`public/fonts/JameelNooriNastaleeqRegular.woff`).
  - **English Ayah Translation**: Dr. Mustafa Khattab (*The Clear Quran*) and Saheeh International.
  - **Word-by-Word Glosses**: English & Urdu word meanings and transliteration from Quran.com API v4.
- **Streaming-Only Audio Policy & Reciters**:
  - **Arabic Recitation**: **Sheikh Fares Abbad (Murattal)** with forced-aligned word-level timestamps (`zaibihassan/Quranic-Recitation-Data`, Apache 2.0) via `cdn.mualim.app/fares-abbad-murattal` (EveryAyah MP3 fallback).
  - **Urdu Translation Audio**: **Shamshad Ali Khan (شمشاد علی خان)** via `everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/`.
  - **Listening Modes**: Arabic Only, Urdu Only, and Combined Arabic + Urdu (plays Arabic Ayah with word-by-word highlighting first, then Shamshad Ali Khan Urdu translation, then advances to next Ayah) with separate repeat controls (`1×`, `2×`, `3×`) for Arabic and Urdu.
  - **Strict Streaming-Only Restriction**: Audio is strictly streamed online for free without subscription. No audio download buttons, offline audio playback, audio file caching, or local audio storage are implemented.
- **Offline Quran Text Storage (IndexedDB `albayan_quran_db`)**:
  - Object stores: `surahs` (text, translations, word meanings, timestamps), `customTimings`, `bookmarks`, `favorites`, `readingHistory`, `playbackHistory`, and `kv`.
  - Starter Surahs (1, 112, 113, 114) are pre-bundled for instant offline reading; all 114 Surahs of text & translations can be cached from **Settings**.

## Local Development & Deployment

```bash
npm install
npm run dev       # Starts Vite dev server on port 3000 with PWA service worker enabled
npm run lint      # Runs TypeScript type-checking (tsc --noEmit)
npm run build     # Builds production static bundle + Workbox service worker into dist/
```
