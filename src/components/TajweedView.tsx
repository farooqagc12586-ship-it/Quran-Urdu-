import React, {useState} from 'react';
import {ArrowLeft, Loader2, Pause, Play} from 'lucide-react';
import {getSurahMeta} from '../services/quranService';
import type {QuranVerse, SurahPayload, UserSettings} from '../types/quran';

interface TajweedViewProps {
  surah: SurahPayload | null;
  loading: boolean;
  playingVerseKey: string | null;
  isPlaying: boolean;
  settings: UserSettings;
  onPlayVerse: (verse: QuranVerse) => void;
  onTogglePlayPause: (verse?: QuranVerse) => void;
  onBackToReader: () => void;
}

const TAJWEED_RULES = [
  {
    id: 'ikhfa',
    name: 'Ikhfa',
    arabic: 'إخفاء',
    colorClass: 'bg-[#b91c1c] dark:bg-[#f87171]',
    description: 'Concealing Noon Sakinah or Meem Sakinah with a light nasal sound (2 counts).',
  },
  {
    id: 'idgham',
    name: 'Idgham',
    arabic: 'إدغام',
    colorClass: 'bg-[#047857] dark:bg-[#34d399]',
    description: 'Merging Noon Sakinah or silent letter into the following letter (with/without Ghunnah).',
  },
  {
    id: 'iqlab',
    name: 'Iqlab',
    arabic: 'إقلاب',
    colorClass: 'bg-[#1d4ed8] dark:bg-[#60a5fa]',
    description: 'Converting Noon Sakinah or Tanween before Baa (ب) into a hidden Meem with Ghunnah.',
  },
  {
    id: 'ghunnah',
    name: 'Ghunnah',
    arabic: 'غنة',
    colorClass: 'bg-[#b45309] dark:bg-[#fbbf24]',
    description: 'Nasalized resonance held for 2 counts on Noon/Meem Mushaddadah (نّ / مّ).',
  },
  {
    id: 'qalqalah',
    name: 'Qalqalah',
    arabic: 'قلقلة',
    colorClass: 'bg-[#0369a1] dark:bg-[#38bdf8]',
    description: 'Echoing bounce when letters (ق ط ب ج د) carry Sukoon.',
  },
  {
    id: 'madd',
    name: 'Madd',
    arabic: 'مدّ',
    colorClass: 'bg-[#7e22ce] dark:bg-[#c084fc]',
    description: 'Vowel elongation (2, 4, 5, or 6 counts depending on normal/permissible/necessary Madd).',
  },
  {
    id: 'izhar',
    name: 'Izhar (Clear)',
    arabic: 'إظهار',
    colorClass: 'bg-[var(--text-primary)]',
    description:
      'Clear pronunciation without nasalization before throat letters (ء هـ ع ح غ خ); rendered in standard ink per Mushaf Tajweed convention.',
  },
  {
    id: 'silent',
    name: 'Silent / Connecting',
    arabic: 'همزة الوصل / اللام الشمسية',
    colorClass: 'bg-[#64748b] dark:bg-[#94a3b8]',
    description: 'Hamzatul Wasl, Laam Shamsiyah, and unpronounced silent letters.',
  },
] as const;

export const TajweedView: React.FC<TajweedViewProps> = ({
  surah,
  loading,
  playingVerseKey,
  isPlaying,
  settings,
  onPlayVerse,
  onTogglePlayPause,
  onBackToReader,
}) => {
  const [selectedRule, setSelectedRule] = useState<string | null>(null);

  if (loading || !surah) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-emerald)]" />
      </div>
    );
  }

  const meta = getSurahMeta(surah.surahId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToReader}
            className="mb-2 inline-flex min-h-[38px] items-center gap-1.5 text-xs font-semibold text-[var(--accent-emerald)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Surah Reader</span>
          </button>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
            Tajweed Learning Mode · {meta.nameSimple}
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Verified Quran.com Uthmani Tajweed dataset · Tap any rule below to isolate it in the text
          </p>
        </div>
      </div>

      {/* Interactive Tajweed Legend */}
      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Tajweed Color Legend
          </h2>
          {selectedRule && (
            <button
              type="button"
              onClick={() => setSelectedRule(null)}
              className="min-h-[36px] rounded-lg px-3 text-xs font-medium text-[var(--accent-emerald)] hover:bg-[var(--bg-surface-muted)]"
            >
              Show All Rules
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TAJWEED_RULES.map((rule) => {
            const isFilterable = rule.id !== 'izhar';
            const isSelected = selectedRule === rule.id;
            return (
              <button
                key={rule.id}
                type="button"
                disabled={!isFilterable}
                onClick={() =>
                  isFilterable && setSelectedRule((prev) => (prev === rule.id ? null : rule.id))
                }
                className={`flex flex-col rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-[var(--accent-gold)] bg-[var(--accent-gold-soft)]'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--accent-emerald)]/50'
                } ${!isFilterable ? 'cursor-default' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <span className={`h-3 w-3 shrink-0 rounded-sm ${rule.colorClass}`} />
                    <span>{rule.name}</span>
                  </span>
                  <span className="font-quran text-base text-[var(--text-muted)]" dir="rtl">
                    {rule.arabic}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {rule.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Verified Tajweed Verses */}
      <div
        className={`divide-y divide-[var(--border-hairline)] rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-5 py-2 sm:px-8 ${
          selectedRule ? 'tajweed-filter-active' : ''
        }`}
        data-rule={selectedRule || undefined}
      >
        {surah.verses.map((verse) => {
          const isActive = playingVerseKey === verse.verseKey;
          return (
            <div key={verse.verseKey} className="py-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-emerald)]">
                  {verse.verseKey}
                </span>
                <button
                  type="button"
                  onClick={() => (isActive ? onTogglePlayPause(verse) : onPlayVerse(verse))}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[var(--bg-surface-muted)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--accent-emerald)] hover:text-white"
                >
                  {isActive && isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Listen</span>
                    </>
                  )}
                </button>
              </div>

              <div
                className="font-quran tajweed-text text-right leading-[2.2] text-[var(--text-primary)]"
                dir="rtl"
                style={{fontSize: `${settings.arabicFontSize}px`}}
                dangerouslySetInnerHTML={{__html: verse.textTajweed}}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
