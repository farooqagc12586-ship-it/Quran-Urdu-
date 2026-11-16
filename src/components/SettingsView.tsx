import React, {useRef, useState} from 'react';
import {CheckCircle2, Download, HardDrive, Radio, Upload} from 'lucide-react';
import {downloadAllSurahsTextOffline} from '../services/quranService';
import {putCustomTiming} from '../services/db';
import {parseImportedTimingJson} from '../services/syncEngine';
import type {
  AudioListeningMode,
  HighlightColor,
  ReadingTheme,
  UserSettings,
} from '../types/quran';
import {PWAInstallButton} from './PWAHelpers';

interface SettingsViewProps {
  settings: UserSettings;
  cachedSurahIds: number[];
  customTimingSurahIds: number[];
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onRefreshOfflineStats: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  cachedSurahIds,
  customTimingSurahIds,
  onUpdateSettings,
  onRefreshOfflineStats,
}) => {
  const [textProgress, setTextProgress] = useState<{
    done: number;
    total: number;
    name: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ok: boolean; msg: string} | null>(null);

  const textAbortRef = useRef<AbortController | null>(null);

  const handleDownloadAllText = async () => {
    const controller = new AbortController();
    textAbortRef.current = controller;
    setStatusMessage(null);
    setTextProgress({done: cachedSurahIds.length, total: 114, name: ''});
    try {
      const res = await downloadAllSurahsTextOffline(
        (done, total, name) => setTextProgress({done, total, name}),
        controller.signal,
      );
      setStatusMessage(
        `Offline Quran text, Urdu translations (Maulana Fateh Muhammad Jalandhri & Maulana Muhammad Junagarhi), English meanings, and word timings cached for ${res.completed} of 114 Surahs.`,
      );
      onRefreshOfflineStats();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Offline text caching interrupted.');
    } finally {
      setTextProgress(null);
      textAbortRef.current = null;
    }
  };

  const handleImportTimingFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportedTimingJson(text);
      await putCustomTiming({
        surahId: parsed.surahId,
        verses: parsed.verses,
        sourceName: parsed.sourceName,
        importedAt: Date.now(),
      });
      setImportStatus({
        ok: true,
        msg: `Imported ${parsed.verses.length} verified verse timing records for Surah ${parsed.surahId} (${parsed.sourceName}).`,
      });
      onRefreshOfflineStats();
    } catch (err) {
      setImportStatus({
        ok: false,
        msg: err instanceof Error ? err.message : 'Invalid JSON timing schema.',
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
            Settings, Offline Text &amp; Licensing
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Customize reading themes, typography, Arabic + Urdu listening, and offline text cache
          </p>
        </div>
        <PWAInstallButton label="Install Al-Bayan PWA" />
      </div>

      {/* Audio Listening Mode & Separate Repeat Controls */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
              Audio Selection &amp; Combined Listening (Streaming Only)
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Arabic: Sheikh Fares Abbad · Urdu Translation: Shamshad Ali Khan
            </p>
          </div>
          <Radio className="h-5 w-5 text-[var(--accent-emerald)]" />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">Listening Mode</p>
            <div className="mt-2 grid gap-2">
              {(
                [
                  ['arabic-only', 'Arabic Only (Fares Abbad)'],
                  ['urdu-only', 'Urdu Only (Shamshad Ali Khan)'],
                  ['combined', 'Arabic + Urdu Combined'],
                ] as Array<[AudioListeningMode, string]>
              ).map(([mKey, label]) => (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => onUpdateSettings({listeningMode: mKey})}
                  className={`min-h-[42px] rounded-xl border px-3 text-left text-xs font-semibold transition-colors ${
                    settings.listeningMode === mKey
                      ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)] text-white'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              Arabic Ayah Repeat (Fares Abbad)
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => onUpdateSettings({arabicRepeatCount: cnt})}
                  className={`min-h-[44px] rounded-xl border text-xs font-semibold transition-colors ${
                    settings.arabicRepeatCount === cnt
                      ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)] text-white'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]'
                  }`}
                >
                  {cnt}×
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Plays the Arabic Ayah {settings.arabicRepeatCount} time(s) before Urdu or next Ayah.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              Urdu Ayah Repeat (Shamshad Ali Khan)
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => onUpdateSettings({urduRepeatCount: cnt})}
                  className={`min-h-[44px] rounded-xl border text-xs font-semibold transition-colors ${
                    settings.urduRepeatCount === cnt
                      ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)] text-white'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]'
                  }`}
                >
                  {cnt}×
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Plays the Urdu translation {settings.urduRepeatCount} time(s) after Arabic in Combined
              mode.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
          <strong>Streaming-Only Policy:</strong> All Quran recitations (Sheikh Fares Abbad) and
          Urdu translation audio (Shamshad Ali Khan) are streamed online for free without a
          subscription. Audio downloading, offline audio storage, and extraction are intentionally
          disabled in compliance with reciter streaming permissions.
        </div>
      </section>

      {/* Reading Theme, Highlight Color & Typography */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-6">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Reading Appearance &amp; Translations
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">Reading Theme</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                  ['sepia', 'Sepia'],
                ] as Array<[ReadingTheme, string]>
              ).map(([tKey, label]) => (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => onUpdateSettings({theme: tKey})}
                  className={`min-h-[44px] rounded-xl border text-xs font-semibold transition-colors ${
                    settings.theme === tKey
                      ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald)] text-white'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              Active Word Highlight Color
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(
                [
                  ['emerald', 'Emerald', 'bg-emerald-500'],
                  ['gold', 'Gold', 'bg-amber-500'],
                  ['sapphire', 'Sapphire', 'bg-sky-500'],
                  ['rose', 'Rose', 'bg-rose-500'],
                ] as Array<[HighlightColor, string, string]>
              ).map(([cKey, label, dot]) => (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => onUpdateSettings({highlightColor: cKey})}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors ${
                    settings.highlightColor === cKey
                      ? 'border-[var(--accent-emerald)] bg-[var(--bg-surface-muted)] text-[var(--text-primary)]'
                      : 'border-[var(--border-hairline)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="arabic-size-slider"
                className="text-xs font-semibold text-[var(--text-muted)]"
              >
                Arabic Quranic Font Size: {settings.arabicFontSize}px
              </label>
              <span className="font-mono-tabular text-xs text-[var(--text-muted)]">24px – 52px</span>
            </div>
            <input
              id="arabic-size-slider"
              type="range"
              min={24}
              max={52}
              step={1}
              value={settings.arabicFontSize}
              onChange={(e) => onUpdateSettings({arabicFontSize: Number(e.target.value)})}
              className="mt-2 w-full accent-[var(--accent-emerald)]"
            />
            <div className="mt-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 text-center">
              <p
                className="font-quran text-[var(--text-primary)]"
                dir="rtl"
                style={{fontSize: `${settings.arabicFontSize}px`}}
              >
                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="urdu-size-slider"
                className="text-xs font-semibold text-[var(--text-muted)]"
              >
                Urdu Translation Font Size: {settings.urduFontSize}px
              </label>
              <span className="font-mono-tabular text-xs text-[var(--text-muted)]">14px – 38px</span>
            </div>
            <input
              id="urdu-size-slider"
              type="range"
              min={14}
              max={38}
              step={1}
              value={settings.urduFontSize}
              onChange={(e) => onUpdateSettings({urduFontSize: Number(e.target.value)})}
              className="mt-2 w-full accent-[var(--accent-emerald)]"
            />
            <div className="mt-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 text-center">
              <p
                className="font-urdu text-[var(--text-primary)]"
                dir="rtl"
                style={{fontSize: `${settings.urduFontSize}px`}}
              >
                شروع الله کا نام لے کر جو بڑا مہربان نہایت رحم والا ہے
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-[var(--border-hairline)] pt-5 sm:grid-cols-2">
          <div>
            <label htmlFor="ui-lang" className="block text-xs font-semibold text-[var(--text-muted)]">
              Interface Language
            </label>
            <select
              id="ui-lang"
              value={settings.language}
              onChange={(e) => onUpdateSettings({language: e.target.value as 'en' | 'ur'})}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="en">English</option>
              <option value="ur">اردو (Urdu)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-ur-translator"
              className="block text-xs font-semibold text-[var(--text-muted)]"
            >
              Urdu Translator (Jameel Noori Nastaleeq Regular)
            </label>
            <select
              id="settings-ur-translator"
              value={settings.urduTranslator}
              onChange={(e) =>
                onUpdateSettings({
                  urduTranslator: e.target.value as 'jalandhari' | 'junagarhi',
                })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs font-medium text-[var(--text-primary)]"
            >
              <option value="jalandhari">
                Maulana Fateh Muhammad Jalandhri (مولانا فتح محمد جالندھری)
              </option>
              <option value="junagarhi">
                Maulana Muhammad Junagarhi (مولانا محمد جوناگڑھی)
              </option>
            </select>
          </div>

          <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]">
            <span>Auto-scroll to active word</span>
            <input
              type="checkbox"
              checked={settings.autoScroll}
              onChange={(e) => onUpdateSettings({autoScroll: e.target.checked})}
              className="h-4 w-4 accent-[var(--accent-emerald)]"
            />
          </label>

          <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]">
            <span>Show Urdu Translation</span>
            <input
              type="checkbox"
              checked={settings.showUrdu}
              onChange={(e) => onUpdateSettings({showUrdu: e.target.checked})}
              className="h-4 w-4 accent-[var(--accent-emerald)]"
            />
          </label>

          <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]">
            <span>Show English Translation</span>
            <input
              type="checkbox"
              checked={settings.showEnglish}
              onChange={(e) => onUpdateSettings({showEnglish: e.target.checked})}
              className="h-4 w-4 accent-[var(--accent-emerald)]"
            />
          </label>

          <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]">
            <span>Show Transliteration in Ayah Mode</span>
            <input
              type="checkbox"
              checked={settings.showTransliteration}
              onChange={(e) => onUpdateSettings({showTransliteration: e.target.checked})}
              className="h-4 w-4 accent-[var(--accent-emerald)]"
            />
          </label>

          <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)] sm:col-span-2">
            <span>Continuous Surah Audio Streaming</span>
            <input
              type="checkbox"
              checked={settings.continuousSurahPlayback}
              onChange={(e) => onUpdateSettings({continuousSurahPlayback: e.target.checked})}
              className="h-4 w-4 accent-[var(--accent-emerald)]"
            />
          </label>
        </div>
      </section>

      {/* Offline Quran Text Support (Text-Only Caching; Audio Remains Streaming-Only) */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
              Offline Quran Text Support (IndexedDB)
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Cached Quran Text: {cachedSurahIds.length} / 114 Surahs (Audio is online streaming
              only)
            </p>
          </div>
          <HardDrive className="h-5 w-5 text-[var(--accent-emerald)]" />
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-surface-muted)] px-4 py-3 text-xs font-medium text-[var(--text-primary)]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent-emerald)]" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Cache All 114 Surahs (Arabic Text, Urdu &amp; English Translations, Word Meanings)
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Stores verified Quran text and translations locally for offline reading. Audio files
                are never downloaded or stored on your device.
              </p>
            </div>
            {textProgress ? (
              <button
                type="button"
                onClick={() => textAbortRef.current?.abort()}
                className="min-h-[42px] rounded-xl border border-rose-500 px-4 text-xs font-semibold text-rose-600"
              >
                Cancel ({textProgress.done}/114)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownloadAllText}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[var(--accent-emerald)] px-4 text-xs font-semibold text-white whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Cache All 114 Surahs (Text)</span>
              </button>
            )}
          </div>
          {textProgress && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Caching {textProgress.name || '...'}</span>
                <span className="font-mono-tabular">
                  {textProgress.done} / {textProgress.total}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
                <div
                  className="h-full bg-[var(--accent-emerald)]"
                  style={{width: `${(textProgress.done / textProgress.total) * 100}%`}}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Audio Provider Architecture & Custom Word-Level Timestamp Import */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Authorized Streaming Audio Provider &amp; Word Timestamps
        </h2>

        <div>
          <label
            htmlFor="custom-audio-url"
            className="block text-xs font-semibold text-[var(--text-muted)]"
          >
            Custom Authorized Arabic Streaming URL (optional — leave blank for default Sheikh Fares
            Abbad stream)
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="custom-audio-url"
              type="url"
              value={settings.customAudioBaseUrl}
              onChange={(e) => onUpdateSettings({customAudioBaseUrl: e.target.value})}
              placeholder="https://your-authorized-stream.example/fares-abbad/{surah}/{surah}{ayah}.mp3"
              className="min-h-[44px] flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 text-xs text-[var(--text-primary)]"
            />
            {settings.customAudioBaseUrl && (
              <button
                type="button"
                onClick={() => onUpdateSettings({customAudioBaseUrl: ''})}
                className="min-h-[44px] rounded-xl border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-secondary)]"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Import Verified Word-Level Timestamps (JSON)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            Supports arrays of{' '}
            <code className="font-mono-tabular">
              {`{ "surah": 1, "ayah": 1, "words": [{ "position": 1, "text": "...", "start": 0.0, "end": 0.55 }] }`}
            </code>{' '}
            or forced-alignment Surah JSON files.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]">
              <Upload className="h-3.5 w-3.5" />
              <span>Choose JSON File</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportTimingFile}
                className="hidden"
              />
            </label>
            {customTimingSurahIds.length > 0 && (
              <span className="text-xs text-[var(--accent-emerald)]">
                Custom timings active for Surahs: {customTimingSurahIds.join(', ')}
              </span>
            )}
          </div>
          {importStatus && (
            <p
              className={`mt-2 text-xs font-medium ${
                importStatus.ok ? 'text-[var(--accent-emerald)]' : 'text-rose-600'
              }`}
            >
              {importStatus.msg}
            </p>
          )}
        </div>
      </section>

      {/* Data Sources & Licensing Compliance */}
      <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          Data Sources, Attribution &amp; Streaming Permissions
        </h2>
        <div className="mt-4 divide-y divide-[var(--border-hairline)] text-xs leading-relaxed text-[var(--text-secondary)]">
          <div className="py-3">
            <p className="font-semibold text-[var(--text-primary)]">
              Verified Quranic Uthmani Text &amp; Tajweed Markup
            </p>
            <p className="mt-0.5">
              King Fahd Glorious Quran Printing Complex / Tanzil Uthmani script served via{' '}
              <span className="font-medium">Quran.com API v4</span> (unaltered text preserving all
              Harakat and verified Tajweed rule tags).
            </p>
          </div>
          <div className="py-3">
            <p className="font-semibold text-[var(--text-primary)]">
              Urdu &amp; English Translations + Word-by-Word Meanings
            </p>
            <p className="mt-0.5">
              Urdu: Complete 114-Surah, 6,236-Ayah verified translation by{' '}
              <span className="font-medium">
                Maulana Fateh Muhammad Jalandhri (مولانا فتح محمد جالندھری)
              </span>{' '}
              (AlQuran.cloud <code className="font-mono-tabular">ur.jalandhry</code> / Quran.com
              resource #234, unaltered original text, rendered in{' '}
              <span className="font-medium">Jameel Noori Nastaleeq Regular</span>) alongside{' '}
              <span className="font-medium">Maulana Muhammad Junagarhi (مولانا محمد جوناگڑھی)</span>{' '}
              (<code className="font-mono-tabular">ur.junagarhi</code> / resource #54). English:
              Dr. Mustafa Khattab (<em>The Clear Quran</em>) &amp; Saheeh International, plus
              Quran.com word-by-word Urdu &amp; English glosses.
            </p>
          </div>
          <div className="py-3">
            <p className="font-semibold text-[var(--text-primary)]">
              Sheikh Fares Abbad (Arabic) &amp; Shamshad Ali Khan (Urdu) Streaming Audio
            </p>
            <p className="mt-0.5">
              Arabic recitation &amp; forced-aligned word timestamps by{' '}
              <span className="font-medium">Sheikh Fares Abbad</span> via{' '}
              <code className="font-mono-tabular">cdn.mualim.app/fares-abbad-murattal</code> (Apache
              2.0 alignment dataset). Urdu translation audio recited by{' '}
              <span className="font-medium">Shamshad Ali Khan (شمشاد علی خان)</span> via{' '}
              <code className="font-mono-tabular">
                everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps
              </code>
              . Both audio streams are strictly <strong>streaming-only</strong> for free listening
              without downloading or local audio file storage.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
