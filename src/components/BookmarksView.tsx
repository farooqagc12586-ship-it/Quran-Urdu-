import React, {useState} from 'react';
import {Bookmark, Clock, Headphones, Heart, Play, Trash2} from 'lucide-react';
import {getSurahMeta} from '../services/quranService';
import type {
  BookmarkItem,
  FavoriteAyah,
  HistoryEntry,
  LastReadingPosition,
} from '../types/quran';

interface BookmarksViewProps {
  lastPosition: LastReadingPosition;
  bookmarks: BookmarkItem[];
  favorites: FavoriteAyah[];
  readingHistory: HistoryEntry[];
  playbackHistory: HistoryEntry[];
  onOpenSurah: (surahId: number, ayahNumber?: number) => void;
  onDeleteBookmark: (verseKey: string) => void;
  onUpdateBookmarkNote: (item: BookmarkItem, note: string) => void;
  onClearHistory: (kind: 'readingHistory' | 'playbackHistory') => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  lastPosition,
  bookmarks,
  favorites,
  readingHistory,
  playbackHistory,
  onOpenSurah,
  onDeleteBookmark,
  onUpdateBookmarkNote,
  onClearHistory,
}) => {
  const [tab, setTab] = useState<'bookmarks' | 'favorites' | 'reading' | 'playback'>('bookmarks');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const lastMeta = getSurahMeta(lastPosition.surahId);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
          Bookmarks, Favorites &amp; History
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Stored locally in IndexedDB for instant offline access
        </p>
      </div>

      {/* Last Reading Position Resume Card */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold text-[var(--accent-emerald)]">
            Last Reading Position
          </p>
          <p className="font-display mt-1 text-lg font-semibold text-[var(--text-primary)]">
            Surah {lastMeta.nameSimple} ({lastMeta.nameArabic}) · Ayah {lastPosition.ayahNumber}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Mode: {lastPosition.mode} · Saved{' '}
            {new Date(lastPosition.updatedAt).toLocaleString()}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenSurah(lastPosition.surahId, lastPosition.ayahNumber)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--accent-emerald)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-emerald-hover)] whitespace-nowrap shrink-0"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Resume Reading</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="inline-flex flex-wrap rounded-xl bg-[var(--bg-surface-muted)] p-1">
        {(
          [
            ['bookmarks', `Bookmarks (${bookmarks.length})`],
            ['favorites', `Favorites (${favorites.length})`],
            ['reading', 'Reading History'],
            ['playback', 'Playback History'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`min-h-[40px] rounded-lg px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              tab === k
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bookmarks List */}
      {tab === 'bookmarks' && (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          {bookmarks.length === 0 ? (
            <div className="py-10 text-center">
              <Bookmark className="mx-auto h-7 w-7 text-[var(--text-muted)]" />
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                No bookmarked Ayahs yet. Tap the bookmark icon while reading any Surah.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {bookmarks.map((bm) => (
                <div key={bm.verseKey} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenSurah(bm.surahId, bm.ayahNumber)}
                      className="text-left hover:opacity-80"
                    >
                      <p className="text-xs font-semibold text-[var(--accent-emerald)]">
                        {bm.surahName} · {bm.verseKey}
                      </p>
                      <p className="font-quran mt-1 text-right text-2xl text-[var(--text-primary)]" dir="rtl">
                        {bm.arabicSnippet}
                      </p>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKey(bm.verseKey);
                          setNoteDraft(bm.note);
                        }}
                        className="min-h-[36px] rounded-lg px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
                      >
                        {bm.note ? 'Edit Note' : 'Add Note'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBookmark(bm.verseKey)}
                        aria-label={`Delete bookmark ${bm.verseKey}`}
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {bm.note && editingKey !== bm.verseKey && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">Note: {bm.note}</p>
                  )}
                  {editingKey === bm.verseKey && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onUpdateBookmarkNote(bm, noteDraft);
                        setEditingKey(null);
                      }}
                      className="mt-3 flex gap-2"
                    >
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Add personal reflection or Hifz note..."
                        className="min-h-[40px] flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs text-[var(--text-primary)]"
                      />
                      <button
                        type="submit"
                        className="min-h-[40px] rounded-xl bg-[var(--accent-emerald)] px-4 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Favorites List */}
      {tab === 'favorites' && (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          {favorites.length === 0 ? (
            <div className="py-10 text-center">
              <Heart className="mx-auto h-7 w-7 text-[var(--text-muted)]" />
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                No favorite Ayahs yet. Tap the heart icon on any Ayah in Ayah Mode.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {favorites.map((fav) => (
                <button
                  key={fav.verseKey}
                  type="button"
                  onClick={() => onOpenSurah(fav.surahId, fav.ayahNumber)}
                  className="block w-full py-4 text-left hover:opacity-80"
                >
                  <p className="text-xs font-semibold text-[var(--accent-emerald)]">
                    {fav.surahName} · {fav.verseKey}
                  </p>
                  <p className="font-quran mt-2 text-right text-2xl text-[var(--text-primary)]" dir="rtl">
                    {fav.arabicText}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{fav.englishText}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reading History */}
      {tab === 'reading' && (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Reading History</h2>
            {readingHistory.length > 0 && (
              <button
                type="button"
                onClick={() => onClearHistory('readingHistory')}
                className="text-xs font-medium text-rose-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {readingHistory.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
              <p className="mt-2 text-sm text-[var(--text-secondary)]">No reading history recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {readingHistory.map((h) => (
                <button
                  key={h.id ?? `${h.surahId}-${h.timestamp}`}
                  type="button"
                  onClick={() => onOpenSurah(h.surahId, h.ayahNumber)}
                  className="flex w-full items-center justify-between py-3 text-left text-sm hover:opacity-80"
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    Surah {h.surahName} · Ayah {h.ayahNumber}
                  </span>
                  <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
                    {new Date(h.timestamp).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playback History */}
      {tab === 'playback' && (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Audio Playback History (Sheikh Fares Abbad)
            </h2>
            {playbackHistory.length > 0 && (
              <button
                type="button"
                onClick={() => onClearHistory('playbackHistory')}
                className="text-xs font-medium text-rose-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {playbackHistory.length === 0 ? (
            <div className="py-8 text-center">
              <Headphones className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                No audio playback history yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {playbackHistory.map((h) => (
                <button
                  key={h.id ?? `${h.surahId}-${h.timestamp}`}
                  type="button"
                  onClick={() => onOpenSurah(h.surahId, h.ayahNumber)}
                  className="flex w-full items-center justify-between py-3 text-left text-sm hover:opacity-80"
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    {h.surahName} · Ayah {h.ayahNumber}
                  </span>
                  <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
                    {new Date(h.timestamp).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
