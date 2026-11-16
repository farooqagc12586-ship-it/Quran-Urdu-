import React, {useState} from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {getSurahMeta} from '../services/quranService';
import {formatTime} from '../services/syncEngine';
import type {
  AudioListeningMode,
  AudioTrackRole,
  QuranVerse,
  RepeatMode,
  SurahPayload,
  UserSettings,
} from '../types/quran';

interface AudioPlayerBarProps {
  surah: SurahPayload | null;
  activeAyahNumber: number;
  playingVerseKey: string | null;
  activeTrackRole: AudioTrackRole;
  isPlaying: boolean;
  isBuffering: boolean;
  audioError: string | null;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
  rangeStart: number;
  rangeEnd: number;
  settings: UserSettings;
  onTogglePlayPause: (fallbackVerse?: QuranVerse) => void;
  onPlayVerse: (verse: QuranVerse, forcedTrack?: AudioTrackRole) => void;
  onSelectSurah: (surahId: number, ayahNumber?: number) => void;
  onSeek: (seconds: number) => void;
  onSetRepeatMode: (mode: RepeatMode) => void;
  onSetRangeStart: (val: number) => void;
  onSetRangeEnd: (val: number) => void;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  surah,
  activeAyahNumber,
  playingVerseKey,
  activeTrackRole,
  isPlaying,
  isBuffering,
  audioError,
  currentTime,
  duration,
  repeatMode,
  rangeStart,
  rangeEnd,
  settings,
  onTogglePlayPause,
  onPlayVerse,
  onSelectSurah,
  onSeek,
  onSetRepeatMode,
  onSetRangeStart,
  onSetRangeEnd,
  onUpdateSettings,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!surah) return null;

  const activeVerse =
    surah.verses.find((v) => v.verseKey === playingVerseKey) ||
    surah.verses.find((v) => v.verseNumber === activeAyahNumber) ||
    surah.verses[0];

  const meta = getSurahMeta(surah.surahId);
  const currentIdx = surah.verses.findIndex((v) => v.verseNumber === activeVerse.verseNumber);

  const handlePrevAyah = () => {
    if (currentIdx > 0) {
      onPlayVerse(surah.verses[currentIdx - 1]);
    } else if (surah.surahId > 1) {
      onSelectSurah(surah.surahId - 1, 1);
    }
  };

  const handleNextAyah = () => {
    if (currentIdx >= 0 && currentIdx + 1 < surah.verses.length) {
      onPlayVerse(surah.verses[currentIdx + 1]);
    } else if (surah.surahId < 114) {
      onSelectSurah(surah.surahId + 1, 1);
    }
  };

  const handleSwitchListeningMode = (mode: AudioListeningMode) => {
    onUpdateSettings({listeningMode: mode});
    if (isPlaying) {
      onPlayVerse(activeVerse, mode === 'urdu-only' ? 'urdu' : 'arabic');
    }
  };

  const safeDuration =
    duration > 0
      ? duration
      : activeTrackRole === 'arabic' && activeVerse.audio.durationMs > 0
        ? activeVerse.audio.durationMs / 1000
        : 1;

  const reciterLabel =
    activeTrackRole === 'urdu'
      ? 'Shamshad Ali Khan · Urdu Translation (Streaming)'
      : 'Sheikh Fares Abbad · Arabic Recitation (Streaming)';

  return (
    <div className="fixed right-0 bottom-16 left-0 z-30 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md md:bottom-0">
      <div className="mx-auto max-w-6xl px-3 py-2 sm:px-6">
        {audioError && (
          <p className="mb-1.5 text-center text-xs font-medium text-amber-700 dark:text-amber-300">
            {audioError}
          </p>
        )}

        {/* Compact Single-Row Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
              {meta.nameSimple} · {activeVerse.verseKey} ·{' '}
              {settings.listeningMode === 'combined'
                ? activeTrackRole === 'urdu'
                  ? 'Combined (Urdu)'
                  : 'Combined (Arabic)'
                : settings.listeningMode === 'urdu-only'
                  ? 'Urdu Only'
                  : 'Arabic Only'}
            </p>
            <p className="truncate text-[11px] text-[var(--text-muted)]">{reciterLabel}</p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handlePrevAyah}
              aria-label="Previous Ayah"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onTogglePlayPause(activeVerse)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[var(--accent-emerald)] text-white shadow-sm transition-colors hover:bg-[var(--accent-emerald-hover)]"
            >
              {isBuffering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current pl-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleNextAyah}
              aria-label="Next Ayah"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2">
            <span className="font-mono-tabular hidden text-xs text-[var(--text-muted)] sm:inline">
              {formatTime(currentTime)} / {formatTime(safeDuration)}
            </span>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label={expanded ? 'Collapse audio controls' : 'Expand audio controls'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Scrubber Bar */}
        <div className="mt-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={0.05}
            value={Math.min(currentTime, safeDuration)}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Audio playback progress"
            className="h-1.5 w-full cursor-pointer accent-[var(--accent-emerald)]"
          />
        </div>

        {/* Expanded Streaming Controls Drawer */}
        {expanded && (
          <div className="mt-3 space-y-4 border-t border-[var(--border-hairline)] pt-3">
            {/* Row 1: Audio Selection + Separate Arabic/Urdu Repeat */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Listening Mode (Streaming Only)
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-1">
                  {(
                    [
                      ['arabic-only', 'Arabic Only'],
                      ['urdu-only', 'Urdu Only'],
                      ['combined', 'Arabic + Urdu'],
                    ] as Array<[AudioListeningMode, string]>
                  ).map(([mKey, label]) => (
                    <button
                      key={mKey}
                      type="button"
                      onClick={() => handleSwitchListeningMode(mKey)}
                      className={`min-h-[36px] rounded-lg px-2 text-[11px] font-semibold transition-colors ${
                        settings.listeningMode === mKey
                          ? 'bg-[var(--accent-emerald)] text-white'
                          : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Arabic Repeat (Fares Abbad)
                </p>
                <div className="mt-1.5 flex gap-1.5">
                  {([1, 2, 3] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onUpdateSettings({arabicRepeatCount: cnt})}
                      className={`min-h-[36px] flex-1 rounded-lg text-xs font-semibold ${
                        settings.arabicRepeatCount === cnt
                          ? 'bg-[var(--accent-emerald)] text-white'
                          : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {cnt}×
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Urdu Repeat (Shamshad Ali Khan)
                </p>
                <div className="mt-1.5 flex gap-1.5">
                  {([1, 2, 3] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onUpdateSettings({urduRepeatCount: cnt})}
                      className={`min-h-[36px] flex-1 rounded-lg text-xs font-semibold ${
                        settings.urduRepeatCount === cnt
                          ? 'bg-[var(--accent-emerald)] text-white'
                          : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {cnt}×
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Speed, Ayah/Range Repeat, Volume */}
            <div className="grid gap-4 border-t border-[var(--border-hairline)] pt-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)]">Playback Speed</p>
                <div className="mt-1.5 flex gap-1.5">
                  {([0.75, 1, 1.25, 1.5] as const).map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => onUpdateSettings({playbackSpeed: spd})}
                      className={`min-h-[36px] flex-1 rounded-lg text-xs font-semibold ${
                        settings.playbackSpeed === spd
                          ? 'bg-[var(--accent-emerald)] text-white'
                          : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]">
                  <Repeat className="h-3 w-3" />
                  <span>Ayah / Range Repeat</span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(
                    [
                      ['none', 'Off'],
                      ['ayah', 'Ayah'],
                      ['ayah-3x', '3× Ayah'],
                      ['range', 'Range'],
                    ] as Array<[RepeatMode, string]>
                  ).map(([rKey, label]) => (
                    <button
                      key={rKey}
                      type="button"
                      onClick={() => onSetRepeatMode(rKey)}
                      className={`min-h-[36px] rounded-lg px-2.5 text-xs font-semibold ${
                        repeatMode === rKey
                          ? 'bg-[var(--accent-emerald)] text-white'
                          : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {repeatMode === 'range' && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <label className="text-[var(--text-muted)]">From</label>
                    <input
                      type="number"
                      min={1}
                      max={surah.verses.length}
                      value={rangeStart}
                      onChange={(e) => onSetRangeStart(Math.max(1, Number(e.target.value)))}
                      className="min-h-[34px] w-16 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 text-center"
                    />
                    <label className="text-[var(--text-muted)]">To</label>
                    <input
                      type="number"
                      min={1}
                      max={surah.verses.length}
                      value={rangeEnd}
                      onChange={(e) =>
                        onSetRangeEnd(
                          Math.min(surah.verses.length, Math.max(1, Number(e.target.value))),
                        )
                      }
                      className="min-h-[34px] w-16 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-2 text-center"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-[var(--text-muted)]">Volume</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({volume: settings.volume > 0 ? 0 : 1})}
                    aria-label="Toggle mute"
                    className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]"
                  >
                    {settings.volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.volume}
                    onChange={(e) => onUpdateSettings({volume: Number(e.target.value)})}
                    aria-label="Audio volume"
                    className="w-full accent-[var(--accent-emerald)]"
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[var(--text-secondary)]">Continuous Surah</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        continuousSurahPlayback: !settings.continuousSurahPlayback,
                      })
                    }
                    className={`rounded-lg px-2.5 py-1 font-semibold ${
                      settings.continuousSurahPlayback
                        ? 'bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)]'
                        : 'bg-[var(--bg-surface-muted)] text-[var(--text-muted)]'
                    }`}
                  >
                    {settings.continuousSurahPlayback ? 'Enabled' : 'Off'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
