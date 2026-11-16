import React, {useState} from 'react';
import {ArrowRight, BookOpen, ChevronRight, Heart, Play, Target} from 'lucide-react';
import {getSurahMeta} from '../services/quranService';
import {toArabicDigits} from '../services/syncEngine';
import type {
  AppScreen,
  DailyGoalState,
  FavoriteAyah,
  LastReadingPosition,
  UserSettings,
} from '../types/quran';
import {UI_COPY} from '../data/i18n';

interface HomeDashboardProps {
  lastPosition: LastReadingPosition;
  dailyGoal: DailyGoalState;
  recentSurahIds: number[];
  favorites: FavoriteAyah[];
  settings: UserSettings;
  onOpenSurah: (surahId: number, ayahNumber?: number) => void;
  onNavigate: (screen: AppScreen) => void;
  onUpdateGoalTarget: (target: number) => void;
}

const FEATURED_SURAH_IDS = [1, 2, 18, 36, 55, 67, 112, 114];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  lastPosition,
  dailyGoal,
  recentSurahIds,
  favorites,
  settings,
  onOpenSurah,
  onNavigate,
  onUpdateGoalTarget,
}) => {
  const copy = UI_COPY[settings.language];
  const lastMeta = getSurahMeta(lastPosition.surahId);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(dailyGoal.targetAyahsPerDay));

  const progressPct = Math.min(
    100,
    Math.round((dailyGoal.todayAyahsRead / Math.max(1, dailyGoal.targetAyahsPerDay)) * 100),
  );

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(goalInput);
    if (Number.isFinite(parsed) && parsed >= 1) {
      onUpdateGoalTarget(Math.round(parsed));
    }
    setEditingGoal(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:px-6 lg:py-8">
      {/* Primary Hero Focal Anchor */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-hairline)] bg-[#0B3B2B] text-white">
        <img
          src="/src/assets/images/quran_hero_pattern_1794804514837.jpg"
          alt="Islamic geometric alabaster and emerald archway"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#072217]/95 via-[#072217]/70 to-[#072217]/40" />

        <div className="relative z-10 flex flex-col justify-between gap-8 p-6 sm:p-10 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wide text-[#E7C666]">
              {copy.reciterName} · {copy.reciterArabic}
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-white [text-wrap:balance] sm:text-4xl">
              Follow Every Word of the Noble Quran in Real Time
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#D8E5DF] sm:text-base">
              Verified Uthmani script with synchronized word-level highlighting, Urdu &amp; English
              meanings, and color-coded Tajweed learning.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenSurah(lastPosition.surahId, lastPosition.ayahNumber)}
                className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#082419] transition-colors hover:bg-[#E2C258]"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {copy.continueReading}: {lastMeta.nameSimple} ({lastPosition.surahId}:
                  {lastPosition.ayahNumber})
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('index')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <BookOpen className="h-4 w-4" />
                <span>Browse All 114 Surahs</span>
              </button>
            </div>
          </div>

          {/* Resume Surah Arabic Callout */}
          <div className="shrink-0 rounded-2xl border border-white/15 bg-black/25 px-6 py-4 text-right backdrop-blur-sm">
            <p className="font-quran text-3xl text-[#E7C666]" dir="rtl">
              سورة {lastMeta.nameArabic}
            </p>
            <p className="mt-1 text-xs text-[#C7D9D0]">
              {lastMeta.translatedName} · Ayah {lastPosition.ayahNumber} of {lastMeta.versesCount}
            </p>
          </div>
        </div>
      </section>

      {/* 2-Column Dashboard Grid: Daily Goal & Recently Played */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Daily Reading Goal */}
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 lg:col-span-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                {copy.dailyGoal}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {copy.ayahsToday} · Streak {dailyGoal.streakDays}d
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setGoalInput(String(dailyGoal.targetAyahsPerDay));
                setEditingGoal((prev) => !prev);
              }}
              className="min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--accent-emerald)] hover:bg-[var(--bg-surface-muted)]"
            >
              {editingGoal ? 'Cancel' : 'Edit Goal'}
            </button>
          </div>

          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-mono-tabular text-3xl font-bold text-[var(--text-primary)]">
              {dailyGoal.todayAyahsRead}
            </span>
            <span className="font-mono-tabular text-sm text-[var(--text-muted)]">
              / {dailyGoal.targetAyahsPerDay} Ayahs ({progressPct}%)
            </span>
          </div>

          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--accent-emerald)] transition-transform duration-300"
              style={{width: `${progressPct}%`}}
            />
          </div>

          {editingGoal && (
            <form onSubmit={handleSaveGoal} className="mt-4 flex items-center gap-2">
              <label className="sr-only" htmlFor="daily-goal-input">
                Target Ayahs per day
              </label>
              <input
                id="daily-goal-input"
                type="number"
                min={1}
                max={286}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="min-h-[44px] w-28 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]"
              />
              <button
                type="submit"
                className="min-h-[44px] rounded-xl bg-[var(--accent-emerald)] px-4 text-sm font-medium text-white"
              >
                Save
              </button>
            </form>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-[var(--border-hairline)] pt-4 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
              <span>Tracks unique Ayahs read or played today</span>
            </span>
          </div>
        </div>

        {/* Recently Played Surahs */}
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
              {copy.recentlyPlayed}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('index')}
              className="inline-flex min-h-[40px] items-center gap-1 text-xs font-medium text-[var(--accent-emerald)] hover:underline"
            >
              <span>Full Index</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recentSurahIds.slice(0, 4).map((id) => {
              const s = getSurahMeta(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenSurah(id, 1)}
                  className="flex min-h-[60px] items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3 text-left transition-colors hover:border-[var(--accent-emerald)]/50 hover:bg-[var(--bg-surface-muted)]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {s.id}. {s.nameSimple}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {s.translatedName} · {s.versesCount} Ayahs
                    </p>
                  </div>
                  <span className="font-quran text-xl text-[var(--accent-emerald)]" dir="rtl">
                    {s.nameArabic}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Access Surahs */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">
            Essential Surahs
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('tajweed')}
            className="min-h-[40px] text-xs font-medium text-[var(--accent-emerald)] hover:underline"
          >
            Open Tajweed Mode
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_SURAH_IDS.map((id) => {
            const s = getSurahMeta(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => onOpenSurah(id, 1)}
                className="flex min-h-[68px] items-center justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3.5 text-left transition-colors hover:border-[var(--accent-emerald)]/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {s.id}. {s.nameSimple}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {s.translatedName} · {s.versesCount}v
                  </p>
                </div>
                <span className="font-quran ml-3 shrink-0 text-xl text-[var(--accent-gold)]" dir="rtl">
                  {s.nameArabic}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Favorite Ayahs Preview */}
      {favorites.length > 0 && (
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
              {copy.favorites}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('bookmarks')}
              className="inline-flex min-h-[40px] items-center gap-1 text-xs font-medium text-[var(--accent-emerald)] hover:underline"
            >
              <span>View all</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="divide-y divide-[var(--border-hairline)]">
            {favorites.slice(0, 3).map((fav) => (
              <button
                key={fav.verseKey}
                type="button"
                onClick={() => onOpenSurah(fav.surahId, fav.ayahNumber)}
                className="flex w-full items-center justify-between gap-4 py-3 text-left hover:opacity-80"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                    <Heart className="h-3 w-3 fill-rose-600 text-rose-600" />
                    <span>
                      {fav.surahName} · Ayah {toArabicDigits(fav.ayahNumber)} ({fav.verseKey})
                    </span>
                  </p>
                  <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                    {fav.englishText}
                  </p>
                </div>
                <p className="font-quran hidden shrink-0 text-xl text-[var(--text-primary)] sm:block" dir="rtl">
                  {fav.arabicText.slice(0, 46)}
                  {fav.arabicText.length > 46 ? '…' : ''}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
