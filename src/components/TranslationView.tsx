import React from 'react';
import {ArrowLeft, Loader2, Pause, Play} from 'lucide-react';
import {getSurahMeta} from '../services/quranService';
import {toArabicDigits} from '../services/syncEngine';
import type {AudioTrackRole, QuranVerse, SurahPayload, UserSettings} from '../types/quran';

interface TranslationViewProps {
  surah: SurahPayload | null;
  loading: boolean;
  playingVerseKey: string | null;
  activeTrackRole: AudioTrackRole;
  isPlaying: boolean;
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onPlayVerse: (verse: QuranVerse, forcedTrack?: AudioTrackRole) => void;
  onTogglePlayPause: (verse?: QuranVerse) => void;
  onBackToReader: () => void;
}

export const TranslationView: React.FC<TranslationViewProps> = ({
  surah,
  loading,
  playingVerseKey,
  activeTrackRole,
  isPlaying,
  settings,
  onUpdateSettings,
  onPlayVerse,
  onTogglePlayPause,
  onBackToReader,
}) => {
  if (loading || !surah) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-emerald)]" />
      </div>
    );
  }

  const meta = getSurahMeta(surah.surahId);
  const cleanIntroHtml = surah.info.text || '';

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
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
          Translations &amp; Surah Introduction · {meta.nameSimple}
        </h1>
      </div>

      {/* Surah Introduction Card */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-hairline)] pb-3">
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
            Surah {meta.nameSimple} ({meta.translatedName})
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            Source: {surah.info.source || 'Quran.com Chapter Info / Tafsir Ibn Kathir'}
          </span>
        </div>

        {surah.info.shortText && (
          <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--text-primary)]">
            {surah.info.shortText}
          </p>
        )}

        {cleanIntroHtml ? (
          <div
            className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--text-secondary)] [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)] [&_p]:leading-relaxed"
            dangerouslySetInnerHTML={{__html: cleanIntroHtml}}
          />
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {meta.revelationPlace === 'makkah' ? 'Makkan' : 'Madinan'} Surah · Revelation order{' '}
            {meta.revelationOrder} · {meta.versesCount} Ayahs (Pages {meta.pages[0]}–{meta.pages[1]}
            ).
          </p>
        )}
      </section>

      {/* Translator Attribution & Controls */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="ur-translator"
              className="block text-xs font-semibold text-[var(--text-muted)]"
            >
              Urdu Translator (اردو ترجمہ)
            </label>
            <select
              id="ur-translator"
              value={settings.urduTranslator}
              onChange={(e) =>
                onUpdateSettings({
                  urduTranslator: e.target.value as 'jalandhari' | 'junagarhi',
                })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="jalandhari">
                Maulana Fateh Muhammad Jalandhri (مولانا فتح محمد جالندھری)
              </option>
              <option value="junagarhi">
                Maulana Muhammad Junagarhi (مولانا محمد جوناگڑھی)
              </option>
            </select>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Verified 114-Surah, 6,236-Ayah original text · Displayed in Jameel Noori Nastaleeq
              Regular
            </p>
          </div>

          <div>
            <label
              htmlFor="en-translator"
              className="block text-xs font-semibold text-[var(--text-muted)]"
            >
              English Translator
            </label>
            <select
              id="en-translator"
              value={settings.englishTranslator}
              onChange={(e) =>
                onUpdateSettings({englishTranslator: e.target.value as 'khattab' | 'saheeh'})
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="khattab">Dr. Mustafa Khattab — The Clear Quran</option>
              <option value="saheeh">Saheeh International</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-3">
          <p className="text-xs text-[var(--text-muted)]">
            Urdu Audio: Shamshad Ali Khan (Streaming) · Arabic Recitation: Sheikh Fares Abbad
          </p>
          <button
            type="button"
            onClick={() => onUpdateSettings({showUrdu: !settings.showUrdu})}
            className="min-h-[36px] rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]"
          >
            {settings.showUrdu ? 'Hide Urdu Translation' : 'Show Urdu Translation'}
          </button>
        </div>
      </section>

      {/* Ayah-by-Ayah Translation List */}
      <div className="divide-y divide-[var(--border-hairline)] rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-5 py-2 sm:px-8">
        {surah.verses.map((verse) => {
          const isActive = playingVerseKey === verse.verseKey;
          const enText =
            settings.englishTranslator === 'saheeh' && verse.translations.enAlt
              ? verse.translations.enAlt
              : verse.translations.en;
          const urText =
            settings.urduTranslator === 'junagarhi'
              ? verse.translations.urJunagarhi || ''
              : verse.translations.urJalandhari || '';

          return (
            <div key={verse.verseKey} className="py-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-emerald)]">
                  {verse.verseKey} · Juz {verse.juzNumber} · Page {verse.pageNumber} · Ruku{' '}
                  {verse.rukuNumber}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      isActive && activeTrackRole === 'arabic'
                        ? onTogglePlayPause(verse)
                        : onPlayVerse(verse, 'arabic')
                    }
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[var(--bg-surface-muted)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--accent-emerald)] hover:text-white"
                  >
                    {isActive && isPlaying && activeTrackRole === 'arabic' ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        <span>Pause Arabic</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Arabic</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isActive && activeTrackRole === 'urdu'
                        ? onTogglePlayPause(verse)
                        : onPlayVerse(verse, 'urdu')
                    }
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--accent-emerald)] hover:text-white"
                  >
                    {isActive && isPlaying && activeTrackRole === 'urdu' ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        <span>Pause Urdu</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Urdu Audio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p
                className="font-quran mt-4 text-right leading-[2.1] text-[var(--text-primary)]"
                dir="rtl"
                style={{fontSize: `${settings.arabicFontSize}px`}}
              >
                {verse.textUthmani}{' '}
                <span className="text-[0.75em] text-[var(--accent-gold)]">
                  ﴿{toArabicDigits(verse.verseNumber)}﴾
                </span>
              </p>

              {settings.showUrdu && (
                <p
                  className="font-urdu mt-4 text-right text-[var(--text-primary)]"
                  dir="rtl"
                  style={{fontSize: `${settings.urduFontSize}px`}}
                >
                  {urText}
                </p>
              )}

              {settings.showEnglish && (
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {enText}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
