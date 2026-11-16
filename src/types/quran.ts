export interface SurahMeta {
  id: number;
  nameSimple: string;
  nameComplex: string;
  nameArabic: string;
  translatedName: string;
  revelationPlace: 'makkah' | 'madinah' | string;
  revelationOrder: number;
  bismillahPre: boolean;
  versesCount: number;
  pages: [number, number];
}

export interface JuzMeta {
  juzNumber: number;
  verseMapping: Record<string, string>;
  firstVerseId: number;
  lastVerseId: number;
  versesCount: number;
}

export interface QuranWord {
  position: number;
  text: string;
  transliteration: string;
  meaningEn: string;
  meaningUr: string;
  /** Audio start time in seconds relative to verse audio start; null if unavailable */
  start: number | null;
  /** Audio end time in seconds relative to verse audio start; null if unavailable */
  end: number | null;
  confidence: number | null;
}

export interface QuranVerse {
  id: number;
  verseNumber: number;
  verseKey: string;
  juzNumber: number;
  pageNumber: number;
  rukuNumber: number;
  textUthmani: string;
  textTajweed: string;
  translations: {
    en: string;
    enAlt: string;
    ur: string;
    urAlt: string;
    urJalandhari?: string;
    urJunagarhi?: string;
  };
  audio: {
    durationMs: number;
    opusUrl: string;
    mp3FallbackUrl: string;
    urduUrl?: string;
  };
  words: QuranWord[];
}

export interface SurahInfo {
  shortText: string;
  source: string;
  text: string;
}

export interface TimingMetadata {
  pipeline?: string;
  surah_id?: number;
  reciter?: string;
  style?: string;
  totalAyahs?: number;
  totalWords?: number;
  valid?: boolean;
  sourceLabel?: string;
}

export interface SurahPayload {
  surahId: number;
  info: SurahInfo;
  timingMetadata: TimingMetadata | null;
  verses: QuranVerse[];
  fetchedAt?: number;
  hasVerifiedTimings?: boolean;
}

export type ReadingTheme = 'light' | 'dark' | 'sepia';
export type HighlightColor = 'emerald' | 'gold' | 'sapphire' | 'rose';
export type ReadingMode = 'continuous' | 'ayah' | 'word';
export type UiLanguage = 'en' | 'ur';
export type AppScreen =
  | 'home'
  | 'index'
  | 'read'
  | 'word'
  | 'translation'
  | 'tajweed'
  | 'bookmarks'
  | 'settings';

export type RepeatMode = 'none' | 'ayah' | 'ayah-3x' | 'word' | 'range';
export type AudioListeningMode = 'arabic-only' | 'urdu-only' | 'combined';
export type AudioTrackRole = 'arabic' | 'urdu';

export interface BookmarkItem {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  surahArabic: string;
  arabicSnippet: string;
  note: string;
  createdAt: number;
}

export interface FavoriteAyah {
  verseKey: string;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  arabicText: string;
  englishText: string;
  createdAt: number;
}

export interface HistoryEntry {
  id?: number;
  surahId: number;
  ayahNumber: number;
  surahName: string;
  timestamp: number;
}

export interface DailyGoalState {
  targetAyahsPerDay: number;
  todayDate: string;
  todayAyahsRead: number;
  readKeysToday: string[];
  streakDays: number;
  lastActiveDate: string;
}

export interface LastReadingPosition {
  surahId: number;
  ayahNumber: number;
  mode: ReadingMode;
  updatedAt: number;
}

export interface UserSettings {
  theme: ReadingTheme;
  arabicFontSize: number;
  urduFontSize: number;
  highlightColor: HighlightColor;
  autoScroll: boolean;
  language: UiLanguage;
  showEnglish: boolean;
  showUrdu: boolean;
  showTransliteration: boolean;
  englishTranslator: 'khattab' | 'saheeh';
  urduTranslator: 'jalandhari' | 'junagarhi';
  continuousSurahPlayback: boolean;
  playbackSpeed: 0.75 | 1 | 1.25 | 1.5;
  volume: number;
  customAudioBaseUrl: string;
  listeningMode: AudioListeningMode;
  arabicRepeatCount: 1 | 2 | 3;
  urduRepeatCount: 1 | 2 | 3;
}

export interface ImportedVerseTiming {
  surah: number;
  ayah: number;
  words: Array<{
    position: number;
    text?: string;
    start: number;
    end: number;
  }>;
}
