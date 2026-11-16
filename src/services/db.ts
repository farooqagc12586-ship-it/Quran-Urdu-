import type {
  BookmarkItem,
  DailyGoalState,
  FavoriteAyah,
  HistoryEntry,
  ImportedVerseTiming,
  LastReadingPosition,
  SurahPayload,
  UserSettings,
} from '../types/quran';

const DB_NAME = 'albayan_quran_db';
const DB_VERSION = 4;

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  arabicFontSize: 24,
  urduFontSize: 20,
  highlightColor: 'emerald',
  autoScroll: true,
  language: 'en',
  showEnglish: true,
  showUrdu: true,
  showTransliteration: false,
  englishTranslator: 'khattab',
  urduTranslator: 'jalandhari',
  continuousSurahPlayback: true,
  playbackSpeed: 1,
  volume: 1,
  customAudioBaseUrl: '',
  listeningMode: 'arabic-only',
  arabicRepeatCount: 1,
  urduRepeatCount: 1,
};

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DEFAULT_DAILY_GOAL: DailyGoalState = {
  targetAyahsPerDay: 20,
  todayDate: getTodayIsoDate(),
  todayAyahsRead: 0,
  readKeysToday: [],
  streakDays: 0,
  lastActiveDate: '',
};

interface CustomTimingRecord {
  surahId: number;
  verses: ImportedVerseTiming[];
  sourceName: string;
  importedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;
      if (!db.objectStoreNames.contains('surahs')) {
        db.createObjectStore('surahs', {keyPath: 'surahId'});
      }
      // Enforce streaming-only policy: remove any legacy audioBlobs store if present
      if (db.objectStoreNames.contains('audioBlobs')) {
        db.deleteObjectStore('audioBlobs');
      }
      if (!db.objectStoreNames.contains('customTimings')) {
        db.createObjectStore('customTimings', {keyPath: 'surahId'});
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        db.createObjectStore('bookmarks', {keyPath: 'verseKey'});
      }
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', {keyPath: 'verseKey'});
      }
      if (!db.objectStoreNames.contains('readingHistory')) {
        db.createObjectStore('readingHistory', {keyPath: 'id', autoIncrement: true});
      }
      if (!db.objectStoreNames.contains('playbackHistory')) {
        db.createObjectStore('playbackHistory', {keyPath: 'id', autoIncrement: true});
      }
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv', {keyPath: 'key'});
      } else if (oldVersion < 4 && request.transaction) {
        const kvStore = request.transaction.objectStore('kv');
        const getReq = kvStore.get('settings');
        getReq.onsuccess = () => {
          const row = getReq.result as {key: string; value?: Partial<UserSettings>} | undefined;
          if (row && row.value) {
            kvStore.put({
              key: 'settings',
              value: {
                ...row.value,
                ...(oldVersion < 3 ? {urduTranslator: 'jalandhari'} : {}),
                arabicFontSize: 24,
                urduFontSize: 20,
              },
            });
          }
        };
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });

  return dbPromise;
}

function wrapRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
  });
}

export async function getCachedSurah(surahId: number): Promise<SurahPayload | undefined> {
  const db = await openDatabase();
  const tx = db.transaction('surahs', 'readonly');
  return wrapRequest(tx.objectStore('surahs').get(surahId));
}

export async function putCachedSurah(payload: SurahPayload): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('surahs', 'readwrite');
  await wrapRequest(tx.objectStore('surahs').put(payload));
}

export async function getCachedSurahIds(): Promise<number[]> {
  const db = await openDatabase();
  const tx = db.transaction('surahs', 'readonly');
  const keys = await wrapRequest(tx.objectStore('surahs').getAllKeys());
  return keys.map(Number).sort((a, b) => a - b);
}

export async function getCustomTiming(surahId: number): Promise<CustomTimingRecord | undefined> {
  const db = await openDatabase();
  const tx = db.transaction('customTimings', 'readonly');
  return wrapRequest(tx.objectStore('customTimings').get(surahId));
}

export async function putCustomTiming(record: CustomTimingRecord): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('customTimings', 'readwrite');
  await wrapRequest(tx.objectStore('customTimings').put(record));
}

export async function getAllCustomTimingIds(): Promise<number[]> {
  const db = await openDatabase();
  const tx = db.transaction('customTimings', 'readonly');
  const keys = await wrapRequest(tx.objectStore('customTimings').getAllKeys());
  return keys.map(Number);
}

export async function getBookmarks(): Promise<BookmarkItem[]> {
  const db = await openDatabase();
  const tx = db.transaction('bookmarks', 'readonly');
  const items: BookmarkItem[] = await wrapRequest(tx.objectStore('bookmarks').getAll());
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveBookmark(item: BookmarkItem): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('bookmarks', 'readwrite');
  await wrapRequest(tx.objectStore('bookmarks').put(item));
}

export async function removeBookmark(verseKey: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('bookmarks', 'readwrite');
  await wrapRequest(tx.objectStore('bookmarks').delete(verseKey));
}

export async function getFavorites(): Promise<FavoriteAyah[]> {
  const db = await openDatabase();
  const tx = db.transaction('favorites', 'readonly');
  const items: FavoriteAyah[] = await wrapRequest(tx.objectStore('favorites').getAll());
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function toggleFavoriteInDb(item: FavoriteAyah): Promise<boolean> {
  const db = await openDatabase();
  const tx = db.transaction('favorites', 'readwrite');
  const store = tx.objectStore('favorites');
  const existing = await wrapRequest(store.get(item.verseKey));
  if (existing) {
    await wrapRequest(store.delete(item.verseKey));
    return false;
  }
  await wrapRequest(store.put(item));
  return true;
}

export async function addHistoryEntry(
  storeName: 'readingHistory' | 'playbackHistory',
  entry: Omit<HistoryEntry, 'id'>,
): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await wrapRequest(store.add(entry));
  const all: HistoryEntry[] = await wrapRequest(store.getAll());
  if (all.length > 60) {
    const excess = all
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .slice(0, all.length - 60);
    for (const old of excess) {
      if (old.id !== undefined) store.delete(old.id);
    }
  }
}

export async function getHistoryEntries(
  storeName: 'readingHistory' | 'playbackHistory',
): Promise<HistoryEntry[]> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const items: HistoryEntry[] = await wrapRequest(tx.objectStore(storeName).getAll());
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

export async function clearHistoryStore(
  storeName: 'readingHistory' | 'playbackHistory',
): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  await wrapRequest(tx.objectStore(storeName).clear());
}

export async function getKv<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('kv', 'readonly');
    const row = await wrapRequest<{key: string; value: T} | undefined>(
      tx.objectStore('kv').get(key),
    );
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

export async function setKv<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('kv', 'readwrite');
  await wrapRequest(tx.objectStore('kv').put({key, value}));
}

export async function getUserSettings(): Promise<UserSettings> {
  const stored = await getKv<Partial<UserSettings>>('settings', {});
  const urduTranslator =
    stored.urduTranslator === 'junagarhi' || stored.urduTranslator === 'jalandhari'
      ? stored.urduTranslator
      : 'jalandhari';
  const arabicFontSize =
    typeof stored.arabicFontSize === 'number' && Number.isFinite(stored.arabicFontSize)
      ? Math.max(24, Math.min(52, stored.arabicFontSize))
      : DEFAULT_SETTINGS.arabicFontSize;
  const urduFontSize =
    typeof stored.urduFontSize === 'number' && Number.isFinite(stored.urduFontSize)
      ? Math.max(14, Math.min(38, stored.urduFontSize))
      : DEFAULT_SETTINGS.urduFontSize;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    urduTranslator,
    arabicFontSize,
    urduFontSize,
  };
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await setKv('settings', settings);
}

export async function getLastReadingPosition(): Promise<LastReadingPosition> {
  return getKv<LastReadingPosition>('lastPosition', {
    surahId: 1,
    ayahNumber: 1,
    mode: 'continuous',
    updatedAt: Date.now(),
  });
}

export async function saveLastReadingPosition(pos: LastReadingPosition): Promise<void> {
  await setKv('lastPosition', pos);
}

export async function getRecentSurahIds(): Promise<number[]> {
  return getKv<number[]>('recentSurahs', [1]);
}

export async function pushRecentSurahId(surahId: number): Promise<number[]> {
  const current = await getRecentSurahIds();
  const next = [surahId, ...current.filter((id) => id !== surahId)].slice(0, 8);
  await setKv('recentSurahs', next);
  return next;
}

export async function getDailyGoal(): Promise<DailyGoalState> {
  const state = await getKv<DailyGoalState>('dailyGoal', DEFAULT_DAILY_GOAL);
  const today = getTodayIsoDate();
  if (state.todayDate !== today) {
    const prev = state.todayDate ? new Date(state.todayDate) : null;
    const curr = new Date(today);
    const diffDays = prev ? Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)) : 99;
    const nextStreak =
      diffDays === 1 && state.todayAyahsRead > 0
        ? state.streakDays
        : diffDays === 0
          ? state.streakDays
          : 0;
    const resetState: DailyGoalState = {
      ...state,
      todayDate: today,
      todayAyahsRead: 0,
      readKeysToday: [],
      streakDays: nextStreak,
    };
    await setKv('dailyGoal', resetState);
    return resetState;
  }
  return state;
}

export async function recordAyahReadGoal(verseKey: string): Promise<DailyGoalState> {
  const state = await getDailyGoal();
  if (state.readKeysToday.includes(verseKey)) {
    return state;
  }
  const today = getTodayIsoDate();
  const nextKeys = [...state.readKeysToday, verseKey];
  const reachedGoalBefore = state.todayAyahsRead >= state.targetAyahsPerDay;
  const nextCount = nextKeys.length;
  const reachedGoalNow = nextCount >= state.targetAyahsPerDay;
  const nextStreak =
    !reachedGoalBefore && reachedGoalNow && state.lastActiveDate !== today
      ? state.streakDays + 1
      : state.streakDays === 0 && nextCount > 0 && state.lastActiveDate !== today
        ? 1
        : state.streakDays;

  const updated: DailyGoalState = {
    ...state,
    todayDate: today,
    todayAyahsRead: nextCount,
    readKeysToday: nextKeys,
    streakDays: nextStreak,
    lastActiveDate: reachedGoalNow ? today : state.lastActiveDate,
  };
  await setKv('dailyGoal', updated);
  return updated;
}

export async function updateDailyGoalTarget(target: number): Promise<DailyGoalState> {
  const state = await getDailyGoal();
  const updated = {...state, targetAyahsPerDay: Math.max(1, Math.min(286, target))};
  await setKv('dailyGoal', updated);
  return updated;
}
