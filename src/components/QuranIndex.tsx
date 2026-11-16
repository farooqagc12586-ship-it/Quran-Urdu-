import React, {useEffect, useMemo, useState} from 'react';
import {CheckCircle2, Search} from 'lucide-react';
import {
  ALL_JUZS,
  ALL_SURAHS,
  getSurahMeta,
  searchQuranVerses,
  type SearchVerseHit,
} from '../services/quranService';
import type {UserSettings} from '../types/quran';
import {UI_COPY} from '../data/i18n';

interface QuranIndexProps {
  cachedSurahIds: number[];
  settings: UserSettings;
  onOpenSurah: (surahId: number, ayahNumber?: number) => void;
}

export const QuranIndex: React.FC<QuranIndexProps> = ({
  cachedSurahIds,
  settings,
  onOpenSurah,
}) => {
  const copy = UI_COPY[settings.language];
  const [tab, setTab] = useState<'surahs' | 'juz'>('surahs');
  const [query, setQuery] = useState('');
  const [revelationFilter, setRevelationFilter] = useState<'all' | 'makkah' | 'madinah'>('all');
  const [verseHits, setVerseHits] = useState<SearchVerseHit[]>([]);
  const [searchingVerses, setSearchingVerses] = useState(false);

  const cachedSet = useMemo(() => new Set(cachedSurahIds), [cachedSurahIds]);

  const filteredSurahs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_SURAHS.filter((s) => {
      if (revelationFilter !== 'all' && s.revelationPlace !== revelationFilter) {
        return false;
      }
      if (!q) return true;
      return (
        String(s.id) === q ||
        s.nameSimple.toLowerCase().includes(q) ||
        s.translatedName.toLowerCase().includes(q) ||
        s.nameArabic.includes(query.trim())
      );
    });
  }, [query, revelationFilter]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setVerseHits([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchingVerses(true);
      try {
        const hits = await searchQuranVerses(trimmed);
        if (active) setVerseHits(hits);
      } finally {
        if (active) setSearchingVerses(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
            Complete Holy Quran Index
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            114 Surahs · 30 Juz · 6,236 Verified Uthmani Ayahs
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-[var(--bg-surface-muted)] p-1">
          <button
            type="button"
            onClick={() => setTab('surahs')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === 'surahs'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {copy.surahs}
          </button>
          <button
            type="button"
            onClick={() => setTab('juz')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === 'juz'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {copy.juz}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-label="Search Surahs and Ayahs"
            className="min-h-[44px] w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] pr-4 pl-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-emerald)] focus:outline-none"
          />
        </div>

        {tab === 'surahs' && (
          <div className="inline-flex rounded-xl bg-[var(--bg-surface-muted)] p-1">
            {(['all', 'makkah', 'madinah'] as const).map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => setRevelationFilter(place)}
                className={`min-h-[38px] rounded-lg px-3 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                  revelationFilter === place
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {place === 'all' ? 'All' : place === 'makkah' ? 'Makkan' : 'Madinan'}
              </button>
            ))}
          </div>
        )}
      </div>

      {(searchingVerses || verseHits.length > 0) && (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            {searchingVerses ? 'Searching Ayahs...' : `Ayah Matches (${verseHits.length})`}
          </p>
          {verseHits.length > 0 && (
            <div className="mt-3 divide-y divide-[var(--border-hairline)]">
              {verseHits.map((hit) => (
                <button
                  key={hit.verseKey}
                  type="button"
                  onClick={() => onOpenSurah(hit.surahId, hit.ayahNumber)}
                  className="flex w-full flex-col gap-1 py-3 text-left hover:opacity-80 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 sm:max-w-xl">
                    <p className="text-xs font-semibold text-[var(--accent-emerald)]">
                      {hit.surahName} · {hit.verseKey}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
                      {hit.translationPreview}
                    </p>
                  </div>
                  <p className="font-quran text-right text-xl text-[var(--text-primary)]" dir="rtl">
                    {hit.textArabic}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'surahs' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSurahs.map((s) => {
            const isTextCached = cachedSet.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpenSurah(s.id, 1)}
                className="group flex min-h-[76px] items-center justify-between gap-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3.5 text-left transition-colors hover:border-[var(--accent-emerald)]"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="font-mono-tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-surface-muted)] text-xs font-semibold text-[var(--text-primary)] group-hover:bg-[var(--accent-emerald)] group-hover:text-white">
                    {s.id}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {s.nameSimple}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                      {s.translatedName} · {s.versesCount} Ayahs ·{' '}
                      {s.revelationPlace === 'makkah' ? 'Makkan' : 'Madinan'}
                    </p>
                    {isTextCached && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[var(--accent-emerald)]">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>Offline Text Ready</span>
                      </p>
                    )}
                  </div>
                </div>

                <span className="font-quran shrink-0 text-2xl text-[var(--accent-emerald)]" dir="rtl">
                  {s.nameArabic}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_JUZS.map((juz) => {
            const entries = Object.entries(juz.verseMapping);
            const firstEntry = entries[0];
            const firstSurahId = firstEntry ? Number(firstEntry[0]) : 1;
            const firstAyah = firstEntry ? Number(firstEntry[1].split('-')[0]) : 1;
            return (
              <div
                key={juz.juzNumber}
                className="flex flex-col justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                      Juz {juz.juzNumber}
                    </h3>
                    <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
                      {juz.versesCount} Ayahs
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entries.map(([sIdStr, range]) => {
                      const sMeta = getSurahMeta(Number(sIdStr));
                      const startAyah = Number(range.split('-')[0]);
                      return (
                        <button
                          key={sIdStr}
                          type="button"
                          onClick={() => onOpenSurah(Number(sIdStr), startAyah)}
                          className="min-h-[36px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent-emerald)] hover:text-[var(--text-primary)]"
                        >
                          {sMeta.nameSimple} ({range})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenSurah(firstSurahId, firstAyah)}
                  className="mt-4 min-h-[42px] w-full rounded-xl bg-[var(--bg-surface-muted)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-emerald)] hover:text-white"
                >
                  Open Juz {juz.juzNumber}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
