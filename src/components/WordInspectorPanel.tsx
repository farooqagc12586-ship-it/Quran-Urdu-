import React from 'react';
import {ChevronLeft, ChevronRight, Play, Repeat, X} from 'lucide-react';
import type {QuranVerse, QuranWord, UserSettings} from '../types/quran';
import {UI_COPY} from '../data/i18n';

interface WordInspectorPanelProps {
  verse: QuranVerse;
  word: QuranWord;
  isPlaying: boolean;
  isWordLooping: boolean;
  settings: UserSettings;
  onPlayWord: (verse: QuranVerse, word: QuranWord, loop?: boolean) => void;
  onToggleWordLoop: (verse: QuranVerse, word: QuranWord) => void;
  onSelectWord: (verse: QuranVerse, word: QuranWord) => void;
  onClose: () => void;
}

export const WordInspectorPanel: React.FC<WordInspectorPanelProps> = ({
  verse,
  word,
  isPlaying,
  isWordLooping,
  settings,
  onPlayWord,
  onToggleWordLoop,
  onSelectWord,
  onClose,
}) => {
  const copy = UI_COPY[settings.language];
  const currentIndex = verse.words.findIndex((w) => w.position === word.position);
  const prevWord = currentIndex > 0 ? verse.words[currentIndex - 1] : null;
  const nextWord = currentIndex < verse.words.length - 1 ? verse.words[currentIndex + 1] : null;
  const hasTiming = word.start !== null && word.end !== null;

  return (
    <div
      role="dialog"
      aria-label={copy.wordInspector}
      className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-lg"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
        <div>
          <p className="text-xs font-semibold text-[var(--accent-emerald)]">
            {copy.wordInspector} · {verse.verseKey} · Word {word.position} of {verse.words.length}
          </p>
          <p className="font-mono-tabular mt-1 text-xs text-[var(--text-muted)]">
            {hasTiming
              ? `Audio segment: ${word.start!.toFixed(2)}s – ${word.end!.toFixed(2)}s`
              : 'Word-level audio timestamp unavailable'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close word inspector"
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Word Display + Meanings */}
      <div className="mt-5 grid gap-5 sm:grid-cols-12 sm:items-center">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-6 sm:col-span-4">
          <span className="font-quran text-5xl leading-relaxed text-[var(--text-primary)]" dir="rtl">
            {word.text}
          </span>
          {word.transliteration && (
            <span className="mt-2 text-xs font-medium text-[var(--text-muted)]">
              {word.transliteration}
            </span>
          )}
        </div>

        <div className="space-y-3 sm:col-span-8">
          <div className="rounded-xl bg-[var(--bg-surface-muted)] px-4 py-3">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
              {copy.urduMeaning}
            </p>
            <p className="font-urdu mt-1 text-right text-lg text-[var(--text-primary)]" dir="rtl">
              {word.meaningUr || '—'}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--bg-surface-muted)] px-4 py-3">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">
              {copy.englishMeaning}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {word.meaningEn || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Playback & Word Navigation Controls */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!hasTiming}
            onClick={() => onPlayWord(verse, word, false)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--accent-emerald)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isPlaying ? 'Replay Word' : copy.playWord}</span>
          </button>

          <button
            type="button"
            disabled={!hasTiming}
            onClick={() => onToggleWordLoop(verse, word)}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              isWordLooping
                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-soft)] text-[var(--text-primary)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
            }`}
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>{isWordLooping ? 'Looping Word' : copy.repeatWord}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!nextWord}
            onClick={() => nextWord && onSelectWord(verse, nextWord)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-40"
            title="Next word (RTL)"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Next Word</span>
          </button>
          <button
            type="button"
            disabled={!prevWord}
            onClick={() => prevWord && onSelectWord(verse, prevWord)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-40"
            title="Previous word (RTL)"
          >
            <span>Prev Word</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Complete Ayah Context */}
      <div className="mt-5 border-t border-[var(--border-hairline)] pt-4">
        <p className="text-xs font-semibold text-[var(--text-muted)]">{copy.fullAyahContext}</p>
        <div className="font-quran mt-2 flex flex-wrap gap-x-2 gap-y-2 text-right text-2xl leading-loose" dir="rtl">
          {verse.words.map((w) => {
            const isSelected = w.position === word.position;
            return (
              <button
                key={w.position}
                type="button"
                onClick={() => onSelectWord(verse, w)}
                className={`rounded-lg px-1.5 py-0.5 transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent-emerald)] text-white'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
                }`}
              >
                {w.text}
              </button>
            );
          })}
        </div>
        {settings.showUrdu &&
          (settings.urduTranslator === 'junagarhi'
            ? verse.translations.urJunagarhi
            : verse.translations.urJalandhari) && (
            <p
              className="font-urdu mt-2 text-right text-[var(--text-primary)]"
              dir="rtl"
              style={{fontSize: `${settings.urduFontSize}px`}}
            >
              {settings.urduTranslator === 'junagarhi'
                ? verse.translations.urJunagarhi
                : verse.translations.urJalandhari}
            </p>
          )}
        {settings.showEnglish && (
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {verse.translations.en}
          </p>
        )}
      </div>
    </div>
  );
};
