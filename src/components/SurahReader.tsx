import React, {useEffect, useRef, useState} from 'react';
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Loader2,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import {getSurahMeta} from '../services/quranService';
import {toArabicDigits} from '../services/syncEngine';
import type {
  AppScreen,
  AudioListeningMode,
  AudioTrackRole,
  HighlightColor,
  QuranVerse,
  QuranWord,
  ReadingMode,
  SurahPayload,
  UserSettings,
} from '../types/quran';
import {UI_COPY} from '../data/i18n';
import {WordInspectorPanel} from './WordInspectorPanel';

interface SurahReaderProps {
  surah: SurahPayload | null;
  loading: boolean;
  error: string | null;
  activeAyahNumber: number;
  mode: ReadingMode;
  playingVerseKey: string | null;
  activeTrackRole: AudioTrackRole;
  isPlaying: boolean;
  activeWordPos: number | null;
  isWordLooping: boolean;
  settings: UserSettings;
  bookmarkedKeys: Set<string>;
  favoriteKeys: Set<string>;
  onChangeMode: (mode: ReadingMode) => void;
  onNavigateScreen: (screen: AppScreen) => void;
  onSelectSurah: (surahId: number, ayahNumber?: number) => void;
  onSelectAyah: (ayahNumber: number) => void;
  onPlayVerse: (verse: QuranVerse, forcedTrack?: AudioTrackRole) => void;
  onTogglePlayPause: (verse?: QuranVerse) => void;
  onPlayWord: (verse: QuranVerse, word: QuranWord, loop?: boolean) => void;
  onToggleWordLoop: (verse: QuranVerse, word: QuranWord) => void;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onToggleBookmark: (verse: QuranVerse) => void;
  onToggleFavorite: (verse: QuranVerse) => void;
  onRetryLoad: () => void;
}

const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  emerald:
    'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-400/70 dark:bg-emerald-900/75 dark:text-emerald-100 dark:ring-emerald-500/60',
  gold: 'bg-amber-100 text-amber-950 ring-1 ring-amber-400/75 dark:bg-amber-900/70 dark:text-amber-100 dark:ring-amber-500/60',
  sapphire:
    'bg-sky-100 text-sky-950 ring-1 ring-sky-400/75 dark:bg-sky-900/75 dark:text-sky-100 dark:ring-sky-500/60',
  rose: 'bg-rose-100 text-rose-950 ring-1 ring-rose-400/75 dark:bg-rose-900/75 dark:text-rose-100 dark:ring-rose-500/60',
};

export const SurahReader: React.FC<SurahReaderProps> = ({
  surah,
  loading,
  error,
  activeAyahNumber,
  mode,
  playingVerseKey,
  activeTrackRole,
  isPlaying,
  activeWordPos,
  isWordLooping,
  settings,
  bookmarkedKeys,
  favoriteKeys,
  onChangeMode,
  onNavigateScreen,
  onSelectSurah,
  onSelectAyah,
  onPlayVerse,
  onTogglePlayPause,
  onPlayWord,
  onToggleWordLoop,
  onUpdateSettings,
  onToggleBookmark,
  onToggleFavorite,
  onRetryLoad,
}) => {
  const copy = UI_COPY[settings.language];
  const [selectedWordState, setSelectedWordState] = useState<{
    verse: QuranVerse;
    word: QuranWord;
  } | null>(null);
  const [showInlineTranslations, setShowInlineTranslations] = useState(true);

  const activeWordElRef = useRef<HTMLButtonElement | null>(null);
  const activeAyahElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedWordState(null);
  }, [surah?.surahId]);

  useEffect(() => {
    if (!settings.autoScroll) return;
    if (activeWordElRef.current) {
      activeWordElRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    } else if (activeAyahElRef.current) {
      activeAyahElRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [playingVerseKey, activeWordPos, settings.autoScroll]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center justify-center gap-3 px-4">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--accent-emerald)]" />
        <p className="text-sm text-[var(--text-secondary)]">
          Loading verified Uthmani text, Urdu translation &amp; word timings...
        </p>
      </div>
    );
  }

  if (error || !surah) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-8">
          <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">
            Unable to Load Surah
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {error || 'Please verify your internet connection or cache Quran text for offline reading in Settings.'}
          </p>
          <button
            type="button"
            onClick={onRetryLoad}
            className="mt-5 min-h-[44px] rounded-xl bg-[var(--accent-emerald)] px-5 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const meta = getSurahMeta(surah.surahId);
  const currentAyah =
    surah.verses.find((v) => v.verseNumber === activeAyahNumber) || surah.verses[0];
  const highlightCls = HIGHLIGHT_CLASSES[settings.highlightColor];

  const handleWordClick = (verse: QuranVerse, word: QuranWord) => {
    onSelectAyah(verse.verseNumber);
    setSelectedWordState({verse, word});
  };

  const renderArabicTextSize = {fontSize: `${settings.arabicFontSize}px`};
  const renderUrduTextSize = {fontSize: `${settings.urduFontSize}px`};

  const getEnText = (v: QuranVerse) =>
    settings.englishTranslator === 'saheeh' && v.translations.enAlt
      ? v.translations.enAlt
      : v.translations.en;

  const getUrText = (v: QuranVerse) =>
    settings.urduTranslator === 'junagarhi'
      ? v.translations.urJunagarhi || ''
      : v.translations.urJalandhari || '';

  const urduTranslatorAttribution =
    settings.urduTranslator === 'junagarhi'
      ? 'Maulana Muhammad Junagarhi (مولانا محمد جوناگڑھی)'
      : 'Maulana Fateh Muhammad Jalandhri (مولانا فتح محمد جالندھری)';

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Surah Banner & Navigation Header */}
      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Surah {meta.id} of 114 ·{' '}
              {meta.revelationPlace === 'makkah' ? 'Makkan' : 'Madinan'} · {meta.versesCount} Ayahs ·
              Juz {currentAyah?.juzNumber || 1}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                {meta.nameSimple}
              </h1>
              <span className="font-quran text-3xl text-[var(--accent-emerald)]" dir="rtl">
                {meta.nameArabic}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {meta.translatedName} · Arabic: Sheikh Fares Abbad · Urdu: Shamshad Ali Khan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={surah.surahId <= 1}
              onClick={() => onSelectSurah(surah.surahId - 1, 1)}
              className="inline-flex min-h-[42px] items-center gap-1 rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{copy.previousSurah}</span>
            </button>

            <button
              type="button"
              disabled={surah.surahId >= 114}
              onClick={() => onSelectSurah(surah.surahId + 1, 1)}
              className="inline-flex min-h-[42px] items-center gap-1 rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-40"
            >
              <span>{copy.nextSurah}</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (playingVerseKey === currentAyah.verseKey) {
                  onTogglePlayPause(currentAyah);
                } else {
                  onPlayVerse(currentAyah);
                }
              }}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[var(--accent-emerald)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-emerald-hover)]"
            >
              {isPlaying && playingVerseKey?.startsWith(`${surah.surahId}:`) ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>{copy.pause}</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Listen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reading Mode + Audio Selection + Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-4">
          <div className="inline-flex flex-wrap rounded-xl bg-[var(--bg-surface-muted)] p-1">
            {(
              [
                ['continuous', copy.continuousMode],
                ['ayah', copy.ayahMode],
                ['word', copy.wordMode],
              ] as const
            ).map(([mKey, label]) => (
              <button
                key={mKey}
                type="button"
                onClick={() => onChangeMode(mKey)}
                className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  mode === mKey
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Audio Selection Control */}
          <div className="inline-flex flex-wrap rounded-xl bg-[var(--bg-surface-muted)] p-1">
            {(
              [
                ['arabic-only', 'Arabic Only'],
                ['urdu-only', 'Urdu Only'],
                ['combined', 'Arabic + Urdu'],
              ] as Array<[AudioListeningMode, string]>
            ).map(([lKey, label]) => (
              <button
                key={lKey}
                type="button"
                onClick={() => {
                  onUpdateSettings({listeningMode: lKey});
                  if (isPlaying && currentAyah) {
                    onPlayVerse(currentAyah, lKey === 'urdu-only' ? 'urdu' : 'arabic');
                  }
                }}
                className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  settings.listeningMode === lKey
                    ? 'bg-[var(--bg-surface)] text-[var(--accent-emerald)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="ayah-jump-select">
              Jump to Ayah
            </label>
            <select
              id="ayah-jump-select"
              value={activeAyahNumber}
              onChange={(e) => onSelectAyah(Number(e.target.value))}
              className="min-h-[40px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[var(--text-primary)]"
            >
              {surah.verses.map((v) => (
                <option key={v.verseNumber} value={v.verseNumber}>
                  Ayah {v.verseNumber}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onUpdateSettings({showUrdu: !settings.showUrdu})}
              className={`min-h-[40px] rounded-xl border px-3 text-xs font-medium transition-colors ${
                settings.showUrdu
                  ? 'border-[var(--accent-emerald)]/50 bg-[var(--accent-emerald)]/10 text-[var(--accent-emerald)]'
                  : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
              }`}
            >
              Urdu: {settings.showUrdu ? 'On' : 'Off'}
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({autoScroll: !settings.autoScroll})}
              className={`min-h-[40px] rounded-xl border px-3 text-xs font-medium transition-colors ${
                settings.autoScroll
                  ? 'border-[var(--accent-emerald)]/50 bg-[var(--accent-emerald)]/10 text-[var(--accent-emerald)]'
                  : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
              }`}
            >
              Auto-Scroll: {settings.autoScroll ? 'On' : 'Off'}
            </button>

            {mode === 'continuous' && (
              <button
                type="button"
                onClick={() => setShowInlineTranslations((prev) => !prev)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{showInlineTranslations ? 'Hide Verses Below' : 'Show Verses Below'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateScreen('translation')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Translations</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateScreen('tajweed')}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
              <span>Tajweed</span>
            </button>

            {/* Quick Manual Font Size Steppers */}
            <div className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 text-xs">
              <span className="px-1 font-medium text-[var(--text-muted)]">Arabic</span>
              <button
                type="button"
                aria-label="Decrease Arabic font size"
                disabled={settings.arabicFontSize <= 24}
                onClick={() =>
                  onUpdateSettings({arabicFontSize: Math.max(24, settings.arabicFontSize - 2)})
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-35"
              >
                −
              </button>
              <span className="font-mono-tabular min-w-[34px] text-center text-[11px] font-semibold text-[var(--text-primary)]">
                {settings.arabicFontSize}px
              </span>
              <button
                type="button"
                aria-label="Increase Arabic font size"
                disabled={settings.arabicFontSize >= 52}
                onClick={() =>
                  onUpdateSettings({arabicFontSize: Math.min(52, settings.arabicFontSize + 2)})
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-35"
              >
                +
              </button>
            </div>

            <div className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 text-xs">
              <span className="px-1 font-medium text-[var(--text-muted)]">Urdu</span>
              <button
                type="button"
                aria-label="Decrease Urdu font size"
                disabled={settings.urduFontSize <= 14}
                onClick={() =>
                  onUpdateSettings({urduFontSize: Math.max(14, settings.urduFontSize - 1)})
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-35"
              >
                −
              </button>
              <span className="font-mono-tabular min-w-[34px] text-center text-[11px] font-semibold text-[var(--text-primary)]">
                {settings.urduFontSize}px
              </span>
              <button
                type="button"
                aria-label="Increase Urdu font size"
                disabled={settings.urduFontSize >= 38}
                onClick={() =>
                  onUpdateSettings({urduFontSize: Math.min(38, settings.urduFontSize + 1)})
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-35"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {!surah.hasVerifiedTimings && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            Word-level timestamps could not be verified for this Surah right now; Ayah-level audio
            continues normally without fabricated word timings.
          </p>
        )}
      </div>

      {/* Interactive Word Inspector Panel */}
      {selectedWordState && (
        <WordInspectorPanel
          verse={selectedWordState.verse}
          word={selectedWordState.word}
          isPlaying={isPlaying}
          isWordLooping={isWordLooping}
          settings={settings}
          onPlayWord={onPlayWord}
          onToggleWordLoop={onToggleWordLoop}
          onSelectWord={(v, w) => setSelectedWordState({verse: v, word: w})}
          onClose={() => setSelectedWordState(null)}
        />
      )}

      {/* Bismillah Ornamental Header */}
      {meta.bismillahPre && (
        <div className="py-2 text-center">
          <p className="font-quran text-3xl text-[var(--text-primary)] sm:text-4xl" dir="rtl">
            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
          </p>
        </div>
      )}

      {/* MODE 1: CONTINUOUS READING */}
      {mode === 'continuous' && (
        <div className="space-y-6">
          <div
            className="rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-8 lg:p-10"
            dir="rtl"
          >
            <div
              className="font-quran flex flex-wrap items-baseline gap-x-2 gap-y-4 leading-[2.15]"
              style={renderArabicTextSize}
            >
              {surah.verses.map((verse) => {
                const isActiveVerse = playingVerseKey === verse.verseKey;
                const isSelectedVerse = activeAyahNumber === verse.verseNumber;
                return (
                  <React.Fragment key={verse.verseKey}>
                    <span
                      ref={isActiveVerse ? activeAyahElRef : undefined}
                      className={`inline-flex flex-wrap items-baseline gap-x-1.5 rounded-xl px-1 transition-colors ${
                        isActiveVerse
                          ? 'bg-[var(--bg-surface-muted)]/60'
                          : isSelectedVerse
                            ? 'bg-[var(--bg-surface-muted)]/35'
                            : ''
                      }`}
                    >
                      {verse.words.map((word) => {
                        const isHighlighted =
                          isActiveVerse &&
                          activeTrackRole === 'arabic' &&
                          activeWordPos === word.position;
                        const isWordPicked =
                          selectedWordState?.verse.verseKey === verse.verseKey &&
                          selectedWordState?.word.position === word.position;
                        return (
                          <button
                            key={word.position}
                            ref={isHighlighted ? activeWordElRef : undefined}
                            type="button"
                            onClick={() => handleWordClick(verse, word)}
                            className={`inline-block cursor-pointer rounded-lg px-1.5 py-0.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent-emerald)] ${
                              isHighlighted
                                ? highlightCls
                                : isWordPicked
                                  ? 'bg-[var(--accent-gold-soft)] underline decoration-[var(--accent-gold)] decoration-2 underline-offset-8'
                                  : 'hover:bg-[var(--bg-surface-muted)]'
                            }`}
                          >
                            {word.text}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAyah(verse.verseNumber);
                          onPlayVerse(verse);
                        }}
                        title={`Listen to Ayah ${verse.verseKey}`}
                        className={`mx-1 inline-flex items-center justify-center rounded-full px-2 text-[0.62em] font-semibold transition-colors ${
                          isActiveVerse
                            ? 'bg-[var(--accent-emerald)] text-white'
                            : 'text-[var(--accent-gold)] hover:bg-[var(--accent-gold-soft)]'
                        }`}
                      >
                        ﴿{toArabicDigits(verse.verseNumber)}﴾
                      </button>
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {showInlineTranslations && (settings.showUrdu || settings.showEnglish) && (
            <div className="divide-y divide-[var(--border-hairline)] rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-5 py-2 sm:px-8">
              <div className="py-3 text-xs text-[var(--text-muted)]">
                Urdu Translation: {urduTranslatorAttribution}
              </div>
              {surah.verses.map((verse) => {
                const isActive = playingVerseKey === verse.verseKey;
                return (
                  <div
                    key={verse.verseKey}
                    className={`py-4 transition-colors ${
                      isActive ? 'bg-[var(--bg-surface-muted)]/40 -mx-3 px-3 rounded-xl' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-emerald)]">
                        {verse.verseKey} · Juz {verse.juzNumber}
                        {isActive && activeTrackRole === 'urdu' ? ' · Playing Urdu Audio' : ''}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onPlayVerse(verse, 'arabic')}
                          className="min-h-[34px] rounded-lg px-2.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
                        >
                          Arabic
                        </button>
                        <button
                          type="button"
                          onClick={() => onPlayVerse(verse, 'urdu')}
                          className="min-h-[34px] rounded-lg px-2.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
                        >
                          Urdu
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleBookmark(verse)}
                          aria-label={`Bookmark Ayah ${verse.verseKey}`}
                          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
                        >
                          <Bookmark
                            className={`h-3.5 w-3.5 ${
                              bookmarkedKeys.has(verse.verseKey)
                                ? 'fill-[var(--accent-gold)] text-[var(--accent-gold)]'
                                : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <p
                      className="font-quran mt-2 text-right leading-[2.1] text-[var(--text-primary)]"
                      dir="rtl"
                      style={renderArabicTextSize}
                    >
                      {verse.textUthmani}
                    </p>
                    {settings.showUrdu && (
                      <p
                        className={`font-urdu mt-2 text-right transition-colors ${
                          isActive && activeTrackRole === 'urdu'
                            ? 'text-[var(--accent-emerald)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                        dir="rtl"
                        style={renderUrduTextSize}
                      >
                        {getUrText(verse)}
                      </p>
                    )}
                    {settings.showEnglish && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {getEnText(verse)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: AYAH MODE */}
      {mode === 'ayah' && currentAyah && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3">
            <button
              type="button"
              disabled={currentAyah.verseNumber <= 1}
              onClick={() => {
                const prev = surah.verses.find(
                  (v) => v.verseNumber === currentAyah.verseNumber - 1,
                );
                if (prev) {
                  onSelectAyah(prev.verseNumber);
                  if (isPlaying) onPlayVerse(prev);
                }
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{copy.previousAyah}</span>
            </button>

            <span className="font-mono-tabular text-xs font-semibold text-[var(--text-primary)]">
              Ayah {currentAyah.verseNumber} of {surah.verses.length} · Juz {currentAyah.juzNumber}
            </span>

            <button
              type="button"
              disabled={currentAyah.verseNumber >= surah.verses.length}
              onClick={() => {
                const next = surah.verses.find(
                  (v) => v.verseNumber === currentAyah.verseNumber + 1,
                );
                if (next) {
                  onSelectAyah(next.verseNumber);
                  if (isPlaying) onPlayVerse(next);
                }
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-40"
            >
              <span>{copy.nextAyah}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-4">
              <span className="font-mono-tabular text-sm font-semibold text-[var(--accent-emerald)]">
                {currentAyah.verseKey} · Page {currentAyah.pageNumber}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    playingVerseKey === currentAyah.verseKey
                      ? onTogglePlayPause(currentAyah)
                      : onPlayVerse(currentAyah)
                  }
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[var(--accent-emerald)] px-4 text-xs font-semibold text-white"
                >
                  {isPlaying && playingVerseKey === currentAyah.verseKey ? (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>{copy.pause}</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{copy.play}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onPlayVerse(currentAyah, 'urdu')}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]"
                >
                  <Play className="h-3 w-3" />
                  <span>Urdu Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleBookmark(currentAyah)}
                  aria-label="Bookmark Ayah"
                  className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
                >
                  <Bookmark
                    className={`h-4 w-4 ${
                      bookmarkedKeys.has(currentAyah.verseKey)
                        ? 'fill-[var(--accent-gold)] text-[var(--accent-gold)]'
                        : ''
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(currentAyah)}
                  aria-label="Favorite Ayah"
                  className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      favoriteKeys.has(currentAyah.verseKey) ? 'fill-rose-600 text-rose-600' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            <div
              className="font-quran mt-8 flex flex-wrap gap-x-2.5 gap-y-4 leading-[2.2]"
              dir="rtl"
              style={renderArabicTextSize}
            >
              {currentAyah.words.map((word) => {
                const isHighlighted =
                  playingVerseKey === currentAyah.verseKey &&
                  activeTrackRole === 'arabic' &&
                  activeWordPos === word.position;
                return (
                  <button
                    key={word.position}
                    ref={isHighlighted ? activeWordElRef : undefined}
                    type="button"
                    onClick={() => handleWordClick(currentAyah, word)}
                    className={`rounded-xl px-2 py-1 transition-colors duration-150 ${
                      isHighlighted ? highlightCls : 'hover:bg-[var(--bg-surface-muted)]'
                    }`}
                  >
                    {word.text}
                  </button>
                );
              })}
              <span className="text-[0.7em] text-[var(--accent-gold)]">
                ﴿{toArabicDigits(currentAyah.verseNumber)}﴾
              </span>
            </div>

            {settings.showTransliteration && (
              <p className="mt-5 text-sm italic text-[var(--text-muted)]">
                {currentAyah.words.map((w) => w.transliteration).join(' ')}
              </p>
            )}

            <div className="mt-8 space-y-4 border-t border-[var(--border-hairline)] pt-6">
              {settings.showUrdu && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    Urdu Translation · {urduTranslatorAttribution}
                  </p>
                  <p
                    className={`font-urdu mt-1 text-right transition-colors ${
                      playingVerseKey === currentAyah.verseKey && activeTrackRole === 'urdu'
                        ? 'text-[var(--accent-emerald)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                    dir="rtl"
                    style={renderUrduTextSize}
                  >
                    {getUrText(currentAyah)}
                  </p>
                </div>
              )}
              {settings.showEnglish && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    English Translation
                  </p>
                  <p className="mt-1 text-base leading-relaxed text-[var(--text-secondary)]">
                    {getEnText(currentAyah)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: WORD-BY-WORD LEARNING MODE */}
      {mode === 'word' && (
        <div className="space-y-5">
          {surah.verses.map((verse) => {
            const isActiveVerse = playingVerseKey === verse.verseKey;
            return (
              <div
                key={verse.verseKey}
                ref={isActiveVerse ? activeAyahElRef : undefined}
                className={`rounded-2xl border p-5 transition-colors ${
                  isActiveVerse
                    ? 'border-[var(--accent-emerald)] bg-[var(--bg-surface)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] pb-3">
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-emerald)]">
                    Ayah {verse.verseKey} · {verse.words.length} Words
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        isActiveVerse ? onTogglePlayPause(verse) : onPlayVerse(verse)
                      }
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[var(--bg-surface-muted)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--accent-emerald)] hover:text-white"
                    >
                      {isActiveVerse && isPlaying ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          <span>{copy.pause}</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Play Ayah</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleBookmark(verse)}
                      aria-label={`Bookmark ${verse.verseKey}`}
                      className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-[var(--border-hairline)] text-[var(--text-secondary)]"
                    >
                      <Bookmark
                        className={`h-3.5 w-3.5 ${
                          bookmarkedKeys.has(verse.verseKey)
                            ? 'fill-[var(--accent-gold)] text-[var(--accent-gold)]'
                            : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3" dir="rtl">
                  {verse.words.map((word) => {
                    const isHighlighted =
                      isActiveVerse &&
                      activeTrackRole === 'arabic' &&
                      activeWordPos === word.position;
                    return (
                      <button
                        key={word.position}
                        ref={isHighlighted ? activeWordElRef : undefined}
                        type="button"
                        onClick={() => {
                          handleWordClick(verse, word);
                          if (word.start !== null) {
                            onPlayWord(verse, word, false);
                          }
                        }}
                        className={`flex min-w-[122px] flex-col items-center rounded-2xl border p-3 text-center transition-colors duration-150 ${
                          isHighlighted
                            ? `${highlightCls} border-transparent`
                            : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--accent-emerald)]/60'
                        }`}
                      >
                        <span
                          className="font-quran text-3xl leading-relaxed text-[var(--text-primary)]"
                          dir="rtl"
                        >
                          {word.text}
                        </span>
                        {word.transliteration && (
                          <span
                            className="mt-1 text-[11px] font-medium text-[var(--text-muted)]"
                            dir="ltr"
                          >
                            {word.transliteration}
                          </span>
                        )}
                        <span className="font-urdu mt-1.5 text-sm text-[var(--text-primary)]" dir="rtl">
                          {word.meaningUr || '—'}
                        </span>
                        <span className="mt-1 text-xs text-[var(--text-secondary)]" dir="ltr">
                          {word.meaningEn || '—'}
                        </span>
                        {word.start !== null && word.end !== null && (
                          <span
                            className="font-mono-tabular mt-2 text-[10px] text-[var(--text-muted)]"
                            dir="ltr"
                          >
                            {word.start.toFixed(2)}s–{word.end.toFixed(2)}s
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {settings.showUrdu && (
                  <p
                    className="font-urdu mt-4 border-t border-[var(--border-hairline)] pt-3 text-right text-[var(--text-primary)]"
                    dir="rtl"
                    style={renderUrduTextSize}
                  >
                    {getUrText(verse)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
