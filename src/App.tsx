/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useEffect, useMemo, useState} from 'react';
import {AppShell} from './components/AppShell';
import {AudioPlayerBar} from './components/AudioPlayerBar';
import {BookmarksView} from './components/BookmarksView';
import {HomeDashboard} from './components/HomeDashboard';
import {QuranIndex} from './components/QuranIndex';
import {SettingsView} from './components/SettingsView';
import {SplashScreen} from './components/SplashScreen';
import {SurahReader} from './components/SurahReader';
import {TajweedView} from './components/TajweedView';
import {TranslationView} from './components/TranslationView';
import {useQuranAudio} from './hooks/useQuranAudio';
import {
  addHistoryEntry,
  clearHistoryStore,
  DEFAULT_DAILY_GOAL,
  DEFAULT_SETTINGS,
  getAllCustomTimingIds,
  getBookmarks,
  getDailyGoal,
  getFavorites,
  getHistoryEntries,
  getLastReadingPosition,
  getRecentSurahIds,
  getUserSettings,
  pushRecentSurahId,
  recordAyahReadGoal,
  removeBookmark,
  saveBookmark,
  saveLastReadingPosition,
  saveUserSettings,
  toggleFavoriteInDb,
  updateDailyGoalTarget,
} from './services/db';
import {getOfflineStats, getSurah, getSurahMeta} from './services/quranService';
import type {
  AppScreen,
  BookmarkItem,
  DailyGoalState,
  FavoriteAyah,
  HistoryEntry,
  LastReadingPosition,
  QuranVerse,
  QuranWord,
  ReadingMode,
  SurahPayload,
  UserSettings,
} from './types/quran';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState<AppScreen>('home');
  const [readingMode, setReadingMode] = useState<ReadingMode>('continuous');

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [lastPosition, setLastPosition] = useState<LastReadingPosition>({
    surahId: 1,
    ayahNumber: 1,
    mode: 'continuous',
    updatedAt: Date.now(),
  });
  const [dailyGoal, setDailyGoal] = useState<DailyGoalState>(DEFAULT_DAILY_GOAL);
  const [recentSurahIds, setRecentSurahIds] = useState<number[]>([1]);

  const [activeSurahId, setActiveSurahId] = useState(1);
  const [activeAyahNumber, setActiveAyahNumber] = useState(1);
  const [surahPayload, setSurahPayload] = useState<SurahPayload | null>(null);
  const [surahLoading, setSurahLoading] = useState(true);
  const [surahError, setSurahError] = useState<string | null>(null);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteAyah[]>([]);
  const [readingHistory, setReadingHistory] = useState<HistoryEntry[]>([]);
  const [playbackHistory, setPlaybackHistory] = useState<HistoryEntry[]>([]);

  const [cachedSurahIds, setCachedSurahIds] = useState<number[]>([1, 112, 113, 114]);
  const [customTimingIds, setCustomTimingIds] = useState<number[]>([]);
  const [wordLoopKey, setWordLoopKey] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'sepia');
    if (settings.theme === 'dark') root.classList.add('dark');
    if (settings.theme === 'sepia') root.classList.add('sepia');
  }, [settings.theme]);

  const refreshOfflineStats = useCallback(async () => {
    try {
      const [stats, customIds] = await Promise.all([getOfflineStats(), getAllCustomTimingIds()]);
      setCachedSurahIds(stats.cachedSurahIds);
      setCustomTimingIds(customIds);
    } catch {
      // Ignore storage stat errors
    }
  }, []);

  const refreshBookmarksAndHistory = useCallback(async () => {
    try {
      const [bms, favs, rHist, pHist] = await Promise.all([
        getBookmarks(),
        getFavorites(),
        getHistoryEntries('readingHistory'),
        getHistoryEntries('playbackHistory'),
      ]);
      setBookmarks(bms);
      setFavorites(favs);
      setReadingHistory(rHist);
      setPlaybackHistory(pHist);
    } catch {
      // Ignore IndexedDB error on private mode
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [loadedSettings, loadedPos, loadedGoal, loadedRecents] = await Promise.all([
          getUserSettings(),
          getLastReadingPosition(),
          getDailyGoal(),
          getRecentSurahIds(),
        ]);
        if (!active) return;
        setSettings(loadedSettings);
        setLastPosition(loadedPos);
        setActiveSurahId(loadedPos.surahId);
        setActiveAyahNumber(loadedPos.ayahNumber);
        setReadingMode(loadedPos.mode || 'continuous');
        setDailyGoal(loadedGoal);
        setRecentSurahIds(loadedRecents);
      } catch {
        // Fallback to defaults
      }
      await Promise.all([refreshOfflineStats(), refreshBookmarksAndHistory()]);
    })();
    return () => {
      active = false;
    };
  }, [refreshBookmarksAndHistory, refreshOfflineStats]);

  const loadSurah = useCallback(
    async (surahId: number, forceRefresh = false) => {
      setSurahLoading(true);
      setSurahError(null);
      try {
        const data = await getSurah(surahId, forceRefresh);
        setSurahPayload(data);
        refreshOfflineStats();
      } catch (err) {
        setSurahError(
          err instanceof Error
            ? err.message
            : 'Could not load Surah data. Check connection or offline text cache.',
        );
      } finally {
        setSurahLoading(false);
      }
    },
    [refreshOfflineStats],
  );

  useEffect(() => {
    loadSurah(activeSurahId);
  }, [activeSurahId, loadSurah]);

  const handleUpdateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = {...prev, ...patch};
      saveUserSettings(next).catch(() => {});
      return next;
    });
  }, []);

  const recordProgress = useCallback(
    async (surahId: number, ayahNumber: number, mode: ReadingMode) => {
      const nextPos: LastReadingPosition = {
        surahId,
        ayahNumber,
        mode,
        updatedAt: Date.now(),
      };
      setLastPosition(nextPos);
      saveLastReadingPosition(nextPos).catch(() => {});
      const nextGoal = await recordAyahReadGoal(`${surahId}:${ayahNumber}`).catch(() => null);
      if (nextGoal) setDailyGoal(nextGoal);
    },
    [],
  );

  const handleSelectSurahAndAyah = useCallback(
    (surahId: number, ayahNumber = 1) => {
      const clampedSurah = Math.max(1, Math.min(114, surahId));
      setActiveSurahId(clampedSurah);
      setActiveAyahNumber(ayahNumber);
      recordProgress(clampedSurah, ayahNumber, readingMode);
      pushRecentSurahId(clampedSurah)
        .then(setRecentSurahIds)
        .catch(() => {});
      const meta = getSurahMeta(clampedSurah);
      addHistoryEntry('readingHistory', {
        surahId: clampedSurah,
        ayahNumber,
        surahName: meta.nameSimple,
        timestamp: Date.now(),
      })
        .then(refreshBookmarksAndHistory)
        .catch(() => {});
    },
    [readingMode, recordProgress, refreshBookmarksAndHistory],
  );

  const handleOpenSurahScreen = useCallback(
    (surahId: number, ayahNumber = 1) => {
      handleSelectSurahAndAyah(surahId, ayahNumber);
      setScreen('read');
      window.scrollTo({top: 0, behavior: 'smooth'});
    },
    [handleSelectSurahAndAyah],
  );

  const handleAyahPlayed = useCallback(
    (verse: QuranVerse) => {
      const [sStr] = verse.verseKey.split(':');
      const sId = Number(sStr);
      setActiveAyahNumber(verse.verseNumber);
      recordProgress(sId, verse.verseNumber, readingMode);
      refreshBookmarksAndHistory();
    },
    [readingMode, recordProgress, refreshBookmarksAndHistory],
  );

  const audio = useQuranAudio({
    surah: surahPayload,
    speed: settings.playbackSpeed,
    volume: settings.volume,
    continuousSurahPlayback: settings.continuousSurahPlayback,
    customAudioBaseUrl: settings.customAudioBaseUrl,
    listeningMode: settings.listeningMode,
    arabicRepeatCount: settings.arabicRepeatCount,
    urduRepeatCount: settings.urduRepeatCount,
    onSelectSurahAndAyah: handleSelectSurahAndAyah,
    onAyahPlayed: handleAyahPlayed,
  });

  const handlePlayWord = useCallback(
    (verse: QuranVerse, word: QuranWord, loop = false) => {
      const key = `${verse.verseKey}:${word.position}`;
      setWordLoopKey(loop ? key : null);
      if (loop) {
        audio.setRepeatMode('word');
      } else if (audio.repeatMode === 'word') {
        audio.setRepeatMode('none');
      }
      audio.playWordSegment(verse, word, loop);
    },
    [audio],
  );

  const handleToggleWordLoop = useCallback(
    (verse: QuranVerse, word: QuranWord) => {
      const key = `${verse.verseKey}:${word.position}`;
      const willLoop = wordLoopKey !== key || audio.repeatMode !== 'word';
      setWordLoopKey(willLoop ? key : null);
      audio.setRepeatMode(willLoop ? 'word' : 'none');
      if (willLoop) {
        audio.playWordSegment(verse, word, true);
      } else {
        audio.stopAudio();
      }
    },
    [audio, wordLoopKey],
  );

  const handleToggleBookmark = useCallback(
    async (verse: QuranVerse) => {
      const exists = bookmarks.some((b) => b.verseKey === verse.verseKey);
      if (exists) {
        await removeBookmark(verse.verseKey);
      } else {
        const meta = getSurahMeta(activeSurahId);
        await saveBookmark({
          verseKey: verse.verseKey,
          surahId: activeSurahId,
          ayahNumber: verse.verseNumber,
          surahName: meta.nameSimple,
          surahArabic: meta.nameArabic,
          arabicSnippet: verse.textUthmani,
          note: '',
          createdAt: Date.now(),
        });
      }
      refreshBookmarksAndHistory();
    },
    [activeSurahId, bookmarks, refreshBookmarksAndHistory],
  );

  const handleToggleFavorite = useCallback(
    async (verse: QuranVerse) => {
      const meta = getSurahMeta(activeSurahId);
      await toggleFavoriteInDb({
        verseKey: verse.verseKey,
        surahId: activeSurahId,
        ayahNumber: verse.verseNumber,
        surahName: meta.nameSimple,
        arabicText: verse.textUthmani,
        englishText: verse.translations.en,
        createdAt: Date.now(),
      });
      refreshBookmarksAndHistory();
    },
    [activeSurahId, refreshBookmarksAndHistory],
  );

  const bookmarkedKeys = useMemo(() => new Set(bookmarks.map((b) => b.verseKey)), [bookmarks]);
  const favoriteKeys = useMemo(() => new Set(favorites.map((f) => f.verseKey)), [favorites]);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <AppShell
        activeScreen={screen}
        settings={settings}
        onNavigate={(next) => {
          setScreen(next);
          window.scrollTo({top: 0, behavior: 'smooth'});
        }}
      >
        {screen === 'home' && (
          <HomeDashboard
            lastPosition={lastPosition}
            dailyGoal={dailyGoal}
            recentSurahIds={recentSurahIds}
            favorites={favorites}
            settings={settings}
            onOpenSurah={handleOpenSurahScreen}
            onNavigate={setScreen}
            onUpdateGoalTarget={async (target) => {
              const updated = await updateDailyGoalTarget(target);
              setDailyGoal(updated);
            }}
          />
        )}

        {screen === 'index' && (
          <QuranIndex
            cachedSurahIds={cachedSurahIds}
            settings={settings}
            onOpenSurah={handleOpenSurahScreen}
          />
        )}

        {(screen === 'read' || screen === 'word') && (
          <SurahReader
            surah={surahPayload}
            loading={surahLoading}
            error={surahError}
            activeAyahNumber={activeAyahNumber}
            mode={screen === 'word' ? 'word' : readingMode}
            playingVerseKey={audio.playingVerseKey}
            activeTrackRole={audio.activeTrackRole}
            isPlaying={audio.isPlaying}
            activeWordPos={audio.activeWordPos}
            isWordLooping={audio.repeatMode === 'word' && Boolean(wordLoopKey)}
            settings={settings}
            bookmarkedKeys={bookmarkedKeys}
            favoriteKeys={favoriteKeys}
            onChangeMode={(m) => {
              setReadingMode(m);
              if (screen === 'word' && m !== 'word') setScreen('read');
              recordProgress(activeSurahId, activeAyahNumber, m);
            }}
            onNavigateScreen={setScreen}
            onSelectSurah={(sId, ay) => handleSelectSurahAndAyah(sId, ay)}
            onSelectAyah={(ay) => {
              setActiveAyahNumber(ay);
              recordProgress(activeSurahId, ay, readingMode);
            }}
            onPlayVerse={audio.playVerse}
            onTogglePlayPause={audio.togglePlayPause}
            onPlayWord={handlePlayWord}
            onToggleWordLoop={handleToggleWordLoop}
            onUpdateSettings={handleUpdateSettings}
            onToggleBookmark={handleToggleBookmark}
            onToggleFavorite={handleToggleFavorite}
            onRetryLoad={() => loadSurah(activeSurahId, true)}
          />
        )}

        {screen === 'tajweed' && (
          <TajweedView
            surah={surahPayload}
            loading={surahLoading}
            playingVerseKey={audio.playingVerseKey}
            isPlaying={audio.isPlaying}
            settings={settings}
            onPlayVerse={audio.playVerse}
            onTogglePlayPause={audio.togglePlayPause}
            onBackToReader={() => setScreen('read')}
          />
        )}

        {screen === 'translation' && (
          <TranslationView
            surah={surahPayload}
            loading={surahLoading}
            playingVerseKey={audio.playingVerseKey}
            activeTrackRole={audio.activeTrackRole}
            isPlaying={audio.isPlaying}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onPlayVerse={audio.playVerse}
            onTogglePlayPause={audio.togglePlayPause}
            onBackToReader={() => setScreen('read')}
          />
        )}

        {screen === 'bookmarks' && (
          <BookmarksView
            lastPosition={lastPosition}
            bookmarks={bookmarks}
            favorites={favorites}
            readingHistory={readingHistory}
            playbackHistory={playbackHistory}
            onOpenSurah={handleOpenSurahScreen}
            onDeleteBookmark={async (k) => {
              await removeBookmark(k);
              refreshBookmarksAndHistory();
            }}
            onUpdateBookmarkNote={async (item, note) => {
              await saveBookmark({...item, note});
              refreshBookmarksAndHistory();
            }}
            onClearHistory={async (kind) => {
              await clearHistoryStore(kind);
              refreshBookmarksAndHistory();
            }}
          />
        )}

        {screen === 'settings' && (
          <SettingsView
            settings={settings}
            cachedSurahIds={cachedSurahIds}
            customTimingSurahIds={customTimingIds}
            onUpdateSettings={handleUpdateSettings}
            onRefreshOfflineStats={() => {
              refreshOfflineStats();
              loadSurah(activeSurahId, false);
            }}
          />
        )}
      </AppShell>

      <AudioPlayerBar
        surah={surahPayload}
        activeAyahNumber={activeAyahNumber}
        playingVerseKey={audio.playingVerseKey}
        activeTrackRole={audio.activeTrackRole}
        isPlaying={audio.isPlaying}
        isBuffering={audio.isBuffering}
        audioError={audio.audioError}
        currentTime={audio.currentTime}
        duration={audio.duration}
        repeatMode={audio.repeatMode}
        rangeStart={audio.rangeStart}
        rangeEnd={audio.rangeEnd}
        settings={settings}
        onTogglePlayPause={audio.togglePlayPause}
        onPlayVerse={audio.playVerse}
        onSelectSurah={handleSelectSurahAndAyah}
        onSeek={audio.seekTo}
        onSetRepeatMode={audio.setRepeatMode}
        onSetRangeStart={audio.setRangeStart}
        onSetRangeEnd={audio.setRangeEnd}
        onUpdateSettings={handleUpdateSettings}
      />
    </>
  );
}
