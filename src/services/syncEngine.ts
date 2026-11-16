import type {ImportedVerseTiming, QuranWord} from '../types/quran';

/**
 * Finds the active 1-based word position for a given audio playback timestamp (seconds).
 * Uses ONLY verified word-level start/end timestamps — never invents or evenly divides durations.
 */
export function findActiveWordPosition(words: QuranWord[], currentTimeSec: number): number | null {
  if (!words || words.length === 0) return null;

  // Ensure words actually have verified timestamps
  const timedWords = words.filter((w) => w.start !== null && w.end !== null);
  if (timedWords.length === 0) return null;

  const t = currentTimeSec;

  // 1. Direct interval match (with tiny 25ms visual lead-in so highlight feels crisp)
  for (let i = 0; i < timedWords.length; i++) {
    const w = timedWords[i];
    const start = w.start as number;
    const end = w.end as number;
    if (t >= start - 0.025 && t <= end) {
      return w.position;
    }
  }

  // 2. Natural breath/transition gap between adjacent words (hold previous word if gap < 0.8s)
  for (let i = 0; i < timedWords.length - 1; i++) {
    const curr = timedWords[i];
    const next = timedWords[i + 1];
    const currEnd = curr.end as number;
    const nextStart = next.start as number;
    if (t > currEnd && t < nextStart - 0.025) {
      if (nextStart - currEnd <= 0.8) {
        return curr.position;
      }
      return null;
    }
  }

  // 3. Before the very first word starts: highlight first word only during immediate 150ms pre-roll
  const first = timedWords[0];
  if (first.start !== null && t < first.start && t >= first.start - 0.15) {
    return first.position;
  }

  return null;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(num: number | string): string {
  return String(num)
    .split('')
    .map((ch) => {
      const idx = Number(ch);
      return Number.isInteger(idx) && ch >= '0' && ch <= '9' ? ARABIC_DIGITS[idx] : ch;
    })
    .join('');
}

/**
 * Validates and normalizes user-imported verified word-level timestamp JSON files.
 * Supports:
 * 1) Prompt schema: { surah, ayah, words: [{ position, text, start, end }] } or array thereof
 * 2) Mualim / forced-alignment schema: { metadata: { surah_id }, verses: [{ verseId, words: [{ wordIndex, startTime, endTime }] }] }
 */
export function parseImportedTimingJson(
  rawText: string,
): {surahId: number; verses: ImportedVerseTiming[]; sourceName: string} {
  const parsed = JSON.parse(rawText);

  // Format A: Mualim / forced-alignment surah object
  if (parsed && Array.isArray(parsed.verses)) {
    const surahId = Number(parsed.metadata?.surah_id || parsed.surah || 0);
    if (!surahId || surahId < 1 || surahId > 114) {
      throw new Error('Missing or invalid Surah number (1-114) in timing JSON.');
    }
    const verses: ImportedVerseTiming[] = parsed.verses.map((v: Record<string, unknown>) => {
      const ayah = Number(v.verseId || v.ayah || 0);
      const rawWords = Array.isArray(v.words) ? v.words : [];
      return {
        surah: surahId,
        ayah,
        words: rawWords.map((w: Record<string, unknown>) => {
          const hasMs = typeof w.startTime === 'number' && typeof w.endTime === 'number';
          const start = hasMs ? Number(w.startTime) / 1000 : Number(w.start);
          const end = hasMs ? Number(w.endTime) / 1000 : Number(w.end);
          if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
            throw new Error(`Invalid timestamp bounds in Surah ${surahId}:${ayah}.`);
          }
          return {
            position: Number(w.wordIndex || w.position),
            text: typeof w.text === 'string' ? w.text : undefined,
            start: Number(start.toFixed(3)),
            end: Number(end.toFixed(3)),
          };
        }),
      };
    });
    return {
      surahId,
      verses,
      sourceName: String(parsed.metadata?.reciter || 'Custom Verified Alignment'),
    };
  }

  // Format B: Single verse object or array of verse objects in Prompt schema
  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (list.length === 0) {
    throw new Error('Timing JSON contains no verses.');
  }
  const firstSurah = Number(list[0]?.surah);
  if (!firstSurah || firstSurah < 1 || firstSurah > 114) {
    throw new Error('Each verse entry must include a valid "surah" (1-114) and "ayah".');
  }
  const verses: ImportedVerseTiming[] = list.map((item) => {
    const surah = Number(item.surah);
    const ayah = Number(item.ayah);
    if (surah !== firstSurah) {
      throw new Error('All verses in a single import file must belong to the same Surah.');
    }
    if (!ayah || !Array.isArray(item.words)) {
      throw new Error(`Verse ${surah}:${ayah} is missing a valid words array.`);
    }
    return {
      surah,
      ayah,
      words: item.words.map((w: Record<string, unknown>) => {
        const start = Number(w.start);
        const end = Number(w.end);
        const position = Number(w.position);
        if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(position) || end < start) {
          throw new Error(`Invalid word timestamp at ${surah}:${ayah} word ${position}.`);
        }
        return {
          position,
          text: typeof w.text === 'string' ? w.text : undefined,
          start: Number(start.toFixed(3)),
          end: Number(end.toFixed(3)),
        };
      }),
    };
  });

  return {
    surahId: firstSurah,
    verses,
    sourceName: 'Imported Word Timestamps (JSON)',
  };
}
