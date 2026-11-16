import quranMetadata from '../data/quranMetadata.json';
import bundledSurahsRaw from '../data/bundledSurahs.json';
import type {AudioTrackRole, JuzMeta, QuranVerse, SurahMeta, SurahPayload} from '../types/quran';
import {
  getCachedSurah,
  getCachedSurahIds,
  getCustomTiming,
  putCachedSurah,
} from './db';

const BUNDLED_SURAHS = bundledSurahsRaw as unknown as Record<string, SurahPayload>;

export const ALL_SURAHS: SurahMeta[] = quranMetadata.chapters as SurahMeta[];
export const ALL_JUZS: JuzMeta[] = quranMetadata.juzs as unknown as JuzMeta[];

export const DEFAULT_FARES_ABBAD_CDN = 'https://cdn.mualim.app/fares-abbad-murattal';
export const EVERYAYAH_FARES_ABBAD_MP3 = 'https://everyayah.com/data/Fares_Abbad_64kbps';
export const EVERYAYAH_SHAMSHAD_URDU_MP3 =
  'https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps';

interface UrduCorpusDataset {
  edition: {
    identifier: string;
    translator: string;
    translatorUrdu: string;
    source: string;
    totalSurahs: number;
    totalAyahs: number;
  };
  surahs: Record<string, string[]>;
}

let jalandhariPromise: Promise<UrduCorpusDataset | null> | null = null;
let junagarhiPromise: Promise<UrduCorpusDataset | null> | null = null;

async function getJalandhariDataset(): Promise<UrduCorpusDataset | null> {
  if (typeof window === 'undefined') return null;
  if (!jalandhariPromise) {
    jalandhariPromise = fetch('/data/jalandhariUrdu.json')
      .then((r) => (r.ok ? (r.json() as Promise<UrduCorpusDataset>) : null))
      .catch(() => null);
  }
  return jalandhariPromise;
}

async function getJunagarhiDataset(): Promise<UrduCorpusDataset | null> {
  if (typeof window === 'undefined') return null;
  if (!junagarhiPromise) {
    junagarhiPromise = fetch('/data/junagarhiUrdu.json')
      .then((r) => (r.ok ? (r.json() as Promise<UrduCorpusDataset>) : null))
      .catch(() => null);
  }
  return junagarhiPromise;
}

export function getSurahMeta(surahId: number): SurahMeta {
  return ALL_SURAHS.find((s) => s.id === surahId) || ALL_SURAHS[0];
}

export function getJuzForVerse(surahId: number, ayahNumber: number): number {
  for (const juz of ALL_JUZS) {
    const rangeStr = juz.verseMapping[String(surahId)];
    if (!rangeStr) continue;
    const [startStr, endStr] = rangeStr.split('-');
    const start = Number(startStr);
    const end = Number(endStr || startStr);
    if (ayahNumber >= start && ayahNumber <= end) {
      return juz.juzNumber;
    }
  }
  return 1;
}

interface QuranComWordApi {
  position: number;
  char_type_name: string;
  text_uthmani: string;
  translation?: {text?: string};
  transliteration?: {text?: string};
}

interface QuranComVerseApi {
  id: number;
  verse_number: number;
  verse_key: string;
  juz_number: number;
  page_number: number;
  ruku_number: number;
  text_uthmani: string;
  text_uthmani_tajweed: string;
  translations?: Array<{resource_id: number; text: string}>;
  words: QuranComWordApi[];
}

interface MualimTimingResponse {
  metadata?: {
    pipeline?: string;
    surah_id?: number;
    reciter?: string;
    style?: string;
    totalAyahs?: number;
    totalWords?: number;
    valid?: boolean;
  };
  verses?: Array<{
    verseId: number;
    key: string;
    audioFile: string;
    duration_ms: number;
    words: Array<{
      wordIndex: number;
      text: string;
      startTime: number;
      endTime: number;
      confidence?: number;
    }>;
  }>;
}

function stripTranslationFootnotes(htmlText: string): string {
  return htmlText.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').trim();
}

async function fetchPagedQuranComVerses(surahId: number, language: 'en' | 'ur', translations: string) {
  const allVerses: QuranComVerseApi[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?language=${language}&words=true&translations=${translations}&word_fields=text_uthmani&fields=text_uthmani,text_uthmani_tajweed,juz_number,page_number,ruku_number&per_page=300&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch verified Quran text (HTTP ${res.status}).`);
    }
    const data = await res.json();
    allVerses.push(...(data.verses || []));
    totalPages = data.pagination?.total_pages || 1;
    page += 1;
  }

  return allVerses;
}

async function injectVerifiedUrduDatasets(payload: SurahPayload): Promise<SurahPayload> {
  const [jalandhariData, junagarhiData] = await Promise.all([
    getJalandhariDataset(),
    getJunagarhiDataset(),
  ]);
  const jalandhariVerses = jalandhariData?.surahs?.[String(payload.surahId)] || [];
  const junagarhiVerses = junagarhiData?.surahs?.[String(payload.surahId)] || [];

  if (jalandhariVerses.length === 0 && junagarhiVerses.length === 0) {
    return payload;
  }

  return {
    ...payload,
    verses: payload.verses.map((v) => {
      const jalandhariText = jalandhariVerses[v.verseNumber - 1] || v.translations.urJalandhari || '';
      const junagarhiText = junagarhiVerses[v.verseNumber - 1] || v.translations.urJunagarhi || '';
      return {
        ...v,
        translations: {
          ...v.translations,
          ur: jalandhariText || v.translations.ur,
          urJalandhari: jalandhariText,
          urJunagarhi: junagarhiText,
        },
      };
    }),
  };
}

async function applyCustomTimingOverride(payload: SurahPayload): Promise<SurahPayload> {
  const custom = await getCustomTiming(payload.surahId);
  if (!custom) return payload;

  const byAyah = new Map(custom.verses.map((v) => [v.ayah, v]));
  const updatedVerses: QuranVerse[] = payload.verses.map((verse) => {
    const override = byAyah.get(verse.verseNumber);
    if (!override) return verse;
    return {
      ...verse,
      words: verse.words.map((w) => {
        const tw = override.words.find((ow) => ow.position === w.position);
        return tw ? {...w, start: tw.start, end: tw.end, confidence: 1} : w;
      }),
    };
  });

  return {
    ...payload,
    timingMetadata: {
      ...(payload.timingMetadata || {}),
      reciter: custom.sourceName,
      sourceLabel: `Custom Imported Timestamps (${custom.sourceName})`,
      valid: true,
    },
    hasVerifiedTimings: true,
    verses: updatedVerses,
  };
}

export async function getSurah(surahId: number, forceRefresh = false): Promise<SurahPayload> {
  // 1. Check IndexedDB first unless forceRefresh
  if (!forceRefresh) {
    const cached = await getCachedSurah(surahId);
    if (
      cached &&
      cached.verses &&
      cached.verses.length > 0 &&
      (cached.verses[0].translations?.urJalandhari || cached.verses[0].translations?.urJunagarhi)
    ) {
      return applyCustomTimingOverride(await injectVerifiedUrduDatasets(cached));
    }

    // 2. Check statically bundled Surahs (1, 112, 113, 114)
    const bundled = BUNDLED_SURAHS[String(surahId)];
    if (bundled) {
      const enriched: SurahPayload = await injectVerifiedUrduDatasets({
        ...bundled,
        hasVerifiedTimings: bundled.verses.some((v) => v.words.some((w) => w.start !== null)),
        fetchedAt: Date.now(),
      });
      await putCachedSurah(enriched).catch(() => {});
      return applyCustomTimingOverride(enriched);
    }
  }

  // 3. Fetch verified Arabic Uthmani, word-by-word English & Urdu, Tajweed, verified Jalandhri & Junagarhi datasets, Surah intro, and Fares Abbad timings
  const pad = String(surahId).padStart(3, '0');
  const [enVerses, urVerses, infoRes, timingRes, jalandhariData, junagarhiData] = await Promise.all([
    fetchPagedQuranComVerses(surahId, 'en', '131,20'),
    fetchPagedQuranComVerses(surahId, 'ur', '234,54'),
    fetch(`https://api.quran.com/api/v4/chapters/${surahId}/info?language=en`)
      .then((r) => (r.ok ? r.json() : {chapter_info: {}}))
      .catch(() => ({chapter_info: {}})),
    fetch(`${DEFAULT_FARES_ABBAD_CDN}/${pad}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<MualimTimingResponse>) : null))
      .catch(() => null),
    getJalandhariDataset(),
    getJunagarhiDataset(),
  ]);

  const urByNumber = new Map(urVerses.map((v) => [v.verse_number, v]));
  const timingByAyah = new Map((timingRes?.verses || []).map((t) => [t.verseId, t]));
  const jalandhariLocal = jalandhariData?.surahs?.[String(surahId)] || [];
  const junagarhiLocal = junagarhiData?.surahs?.[String(surahId)] || [];

  const verses: QuranVerse[] = enVerses.map((v) => {
    const urV = urByNumber.get(v.verse_number);
    const tV = timingByAyah.get(v.verse_number);
    const enWords = v.words.filter((w) => w.char_type_name === 'word');
    const urWords = urV ? urV.words.filter((w) => w.char_type_name === 'word') : [];
    const tWords = tV?.words || [];
    const ayPad = String(v.verse_number).padStart(3, '0');

    // Keep each verified Urdu translator strictly isolated (never substitute one for another)
    const jalandhariFromLocal = jalandhariLocal[v.verse_number - 1] || '';
    const jalandhariFromApi = stripTranslationFootnotes(
      urV?.translations?.find((t) => t.resource_id === 234)?.text || '',
    );
    const authenticJalandhari = jalandhariFromLocal || jalandhariFromApi;

    const junagarhiFromLocal = junagarhiLocal[v.verse_number - 1] || '';
    const junagarhiFromApi = stripTranslationFootnotes(
      urV?.translations?.find((t) => t.resource_id === 54)?.text || '',
    );
    const authenticJunagarhi = junagarhiFromLocal || junagarhiFromApi;

    return {
      id: v.id,
      verseNumber: v.verse_number,
      verseKey: v.verse_key,
      juzNumber: v.juz_number,
      pageNumber: v.page_number,
      rukuNumber: v.ruku_number,
      textUthmani: v.text_uthmani,
      textTajweed: v.text_uthmani_tajweed || v.text_uthmani,
      translations: {
        en: stripTranslationFootnotes(
          v.translations?.find((t) => t.resource_id === 131)?.text || v.translations?.[0]?.text || '',
        ),
        enAlt: stripTranslationFootnotes(v.translations?.find((t) => t.resource_id === 20)?.text || ''),
        ur: authenticJalandhari,
        urAlt: authenticJunagarhi,
        urJalandhari: authenticJalandhari,
        urJunagarhi: authenticJunagarhi,
      },
      audio: {
        durationMs: tV?.duration_ms || 0,
        opusUrl: `${DEFAULT_FARES_ABBAD_CDN}/${pad}/${pad}${ayPad}.opus`,
        mp3FallbackUrl: `${EVERYAYAH_FARES_ABBAD_MP3}/${pad}${ayPad}.mp3`,
        urduUrl: `${EVERYAYAH_SHAMSHAD_URDU_MP3}/${pad}${ayPad}.mp3`,
      },
      words: enWords.map((w, idx) => {
        const tw = tWords.find((x) => x.wordIndex === w.position) || tWords[idx];
        return {
          position: w.position,
          text: w.text_uthmani,
          transliteration: w.transliteration?.text || '',
          meaningEn: w.translation?.text || '',
          meaningUr: urWords[idx]?.translation?.text || '',
          start: tw ? Number((tw.startTime / 1000).toFixed(3)) : null,
          end: tw ? Number((tw.endTime / 1000).toFixed(3)) : null,
          confidence: tw?.confidence ?? null,
        };
      }),
    };
  });

  const payload: SurahPayload = {
    surahId,
    info: {
      shortText: infoRes.chapter_info?.short_text || '',
      source: infoRes.chapter_info?.source || 'Tafsir Ibn Kathir (Quran.com)',
      text: infoRes.chapter_info?.text || '',
    },
    timingMetadata: timingRes?.metadata
      ? {
          ...timingRes.metadata,
          sourceLabel: 'Sheikh Fares Abbad (Murattal · Verified Alignment)',
        }
      : null,
    hasVerifiedTimings: Boolean(timingRes?.verses?.length),
    verses,
    fetchedAt: Date.now(),
  };

  await putCachedSurah(payload).catch(() => {});
  return applyCustomTimingOverride(payload);
}

/**
 * Resolves the STREAMING-ONLY audio URL for either Sheikh Fares Abbad (Arabic)
 * or Shamshad Ali Khan (Urdu Translation). Never reads from or writes to local downloadable audio storage.
 */
export function resolveStreamingAudioUrl(
  verse: QuranVerse,
  track: AudioTrackRole,
  customAudioBaseUrl?: string,
): string {
  const [sStr, aStr] = verse.verseKey.split(':');
  const padS = sStr.padStart(3, '0');
  const padA = aStr.padStart(3, '0');

  if (track === 'urdu') {
    return verse.audio.urduUrl || `${EVERYAYAH_SHAMSHAD_URDU_MP3}/${padS}${padA}.mp3`;
  }

  if (customAudioBaseUrl && customAudioBaseUrl.trim()) {
    const cleanBase = customAudioBaseUrl.trim().replace(/\/+$/, '');
    if (cleanBase.includes('{surah}') || cleanBase.includes('{ayah}')) {
      return cleanBase.replace(/\{surah\}/g, padS).replace(/\{ayah\}/g, padA);
    }
    return `${cleanBase}/${padS}${padA}.mp3`;
  }

  const probe = typeof document !== 'undefined' ? document.createElement('audio') : null;
  const canOpus =
    probe &&
    (probe.canPlayType('audio/ogg; codecs="opus"') !== '' ||
      probe.canPlayType('audio/webm; codecs="opus"') !== '' ||
      probe.canPlayType('audio/opus') !== '');

  return canOpus ? verse.audio.opusUrl : verse.audio.mp3FallbackUrl;
}

export async function downloadAllSurahsTextOffline(
  onProgress?: (completed: number, total: number, currentSurahName: string) => void,
  signal?: AbortSignal,
): Promise<{completed: number; total: number}> {
  const cachedIds = new Set(await getCachedSurahIds());
  let completed = cachedIds.size;
  onProgress?.(completed, 114, '');

  for (const surah of ALL_SURAHS) {
    if (signal?.aborted) break;
    if (!cachedIds.has(surah.id)) {
      await getSurah(surah.id);
      completed += 1;
    } else {
      await getSurah(surah.id);
    }
    onProgress?.(completed, 114, surah.nameSimple);
  }
  return {completed, total: 114};
}

export async function getOfflineStats() {
  const cachedSurahIds = await getCachedSurahIds();
  return {
    cachedSurahIds,
  };
}

export interface SearchVerseHit {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  textArabic: string;
  translationPreview: string;
}

export async function searchQuranVerses(query: string): Promise<SearchVerseHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const keyMatch = trimmed.match(/^(\d{1,3})\s*[:\-]\s*(\d{1,3})$/);
  if (keyMatch) {
    const sId = Number(keyMatch[1]);
    const aNum = Number(keyMatch[2]);
    if (sId >= 1 && sId <= 114) {
      const meta = getSurahMeta(sId);
      if (aNum >= 1 && aNum <= meta.versesCount) {
        try {
          const surah = await getSurah(sId);
          const verse = surah.verses.find((v) => v.verseNumber === aNum);
          if (verse) {
            return [
              {
                verseKey: verse.verseKey,
                surahId: sId,
                ayahNumber: aNum,
                surahName: meta.nameSimple,
                textArabic: verse.textUthmani,
                translationPreview:
                  verse.translations.urJalandhari ||
                  verse.translations.urJunagarhi ||
                  verse.translations.en,
              },
            ];
          }
        } catch {
          return [
            {
              verseKey: `${sId}:${aNum}`,
              surahId: sId,
              ayahNumber: aNum,
              surahName: meta.nameSimple,
              textArabic: meta.nameArabic,
              translationPreview: `Jump to Surah ${meta.nameSimple}, Ayah ${aNum}`,
            },
          ];
        }
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const res = await fetch(
        `https://api.quran.com/api/v4/search?q=${encodeURIComponent(trimmed)}&size=15&page=1&language=en`,
      );
      if (res.ok) {
        const data = await res.json();
        const results = data.search?.results || [];
        return results.map((r: {verse_key: string; text: string; translations?: Array<{text: string}>}) => {
          const [sStr, aStr] = r.verse_key.split(':');
          const sId = Number(sStr);
          const meta = getSurahMeta(sId);
          return {
            verseKey: r.verse_key,
            surahId: sId,
            ayahNumber: Number(aStr),
            surahName: meta.nameSimple,
            textArabic: r.text,
            translationPreview: stripTranslationFootnotes(r.translations?.[0]?.text || ''),
          };
        });
      }
    } catch {
      // Fall through to offline search
    }
  }

  const hits: SearchVerseHit[] = [];

  // Search full 6,236-Ayah Jalandhri & Junagarhi Urdu datasets directly
  const [jalandhariData, junagarhiData] = await Promise.all([
    getJalandhariDataset(),
    getJunagarhiDataset(),
  ]);
  for (const dataset of [jalandhariData, junagarhiData]) {
    if (!dataset) continue;
    for (const [sIdStr, ayahs] of Object.entries(dataset.surahs)) {
      const sId = Number(sIdStr);
      const meta = getSurahMeta(sId);
      for (let i = 0; i < ayahs.length; i++) {
        if (ayahs[i].includes(trimmed)) {
          const verseKey = `${sId}:${i + 1}`;
          if (!hits.some((h) => h.verseKey === verseKey)) {
            hits.push({
              verseKey,
              surahId: sId,
              ayahNumber: i + 1,
              surahName: meta.nameSimple,
              textArabic: meta.nameArabic,
              translationPreview: ayahs[i],
            });
            if (hits.length >= 20) return hits;
          }
        }
      }
    }
  }

  const cachedIds = await getCachedSurahIds();
  const qLower = trimmed.toLowerCase();
  for (const sId of cachedIds) {
    const surah = await getCachedSurah(sId);
    if (!surah) continue;
    const meta = getSurahMeta(sId);
    for (const v of surah.verses) {
      if (
        v.textUthmani.includes(trimmed) ||
        v.translations.en.toLowerCase().includes(qLower)
      ) {
        hits.push({
          verseKey: v.verseKey,
          surahId: sId,
          ayahNumber: v.verseNumber,
          surahName: meta.nameSimple,
          textArabic: v.textUthmani,
          translationPreview:
            v.translations.urJalandhari || v.translations.urJunagarhi || v.translations.en,
        });
        if (hits.length >= 20) return hits;
      }
    }
  }
  return hits;
}
