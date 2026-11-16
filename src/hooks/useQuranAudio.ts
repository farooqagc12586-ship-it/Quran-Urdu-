import {useCallback, useEffect, useRef, useState} from 'react';
import {getSurahMeta, resolveStreamingAudioUrl} from '../services/quranService';
import {findActiveWordPosition} from '../services/syncEngine';
import {addHistoryEntry, pushRecentSurahId} from '../services/db';
import type {
  AudioListeningMode,
  AudioTrackRole,
  QuranVerse,
  QuranWord,
  RepeatMode,
  SurahPayload,
} from '../types/quran';

interface UseQuranAudioOptions {
  surah: SurahPayload | null;
  speed: 0.75 | 1 | 1.25 | 1.5;
  volume: number;
  continuousSurahPlayback: boolean;
  customAudioBaseUrl: string;
  listeningMode: AudioListeningMode;
  arabicRepeatCount: 1 | 2 | 3;
  urduRepeatCount: 1 | 2 | 3;
  onSelectSurahAndAyah: (surahId: number, ayahNumber: number) => void;
  onAyahPlayed?: (verse: QuranVerse) => void;
}

export function useQuranAudio({
  surah,
  speed,
  volume,
  continuousSurahPlayback,
  customAudioBaseUrl,
  listeningMode,
  arabicRepeatCount,
  urduRepeatCount,
  onSelectSurahAndAyah,
  onAyahPlayed,
}: UseQuranAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [playingVerseKey, setPlayingVerseKey] = useState<string | null>(null);
  const [activeTrackRole, setActiveTrackRole] = useState<AudioTrackRole>('arabic');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeWordPos, setActiveWordPos] = useState<number | null>(null);

  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(7);
  const [ayahRepeatCounter, setAyahRepeatCounter] = useState(0);

  // Refs for synchronous access inside RAF and audio event listeners
  const activeVerseRef = useRef<QuranVerse | null>(null);
  const activeTrackRoleRef = useRef<AudioTrackRole>('arabic');
  const activeWordPosRef = useRef<number | null>(null);
  const wordSegmentRef = useRef<{start: number; end: number; loop: boolean} | null>(null);

  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  const rangeRef = useRef({start: rangeStart, end: rangeEnd});
  const ayahRepeatCounterRef = useRef(ayahRepeatCounter);
  const arabicDoneRef = useRef(0);
  const urduDoneRef = useRef(0);

  const listeningModeRef = useRef(listeningMode);
  const arabicRepeatRef = useRef(arabicRepeatCount);
  const urduRepeatRef = useRef(urduRepeatCount);
  const continuousRef = useRef(continuousSurahPlayback);
  const surahRef = useRef(surah);
  const speedRef = useRef(speed);
  const volumeRef = useRef(volume);
  const customBaseRef = useRef(customAudioBaseUrl);
  const loadSeqRef = useRef(0);

  repeatModeRef.current = repeatMode;
  rangeRef.current = {start: rangeStart, end: rangeEnd};
  ayahRepeatCounterRef.current = ayahRepeatCounter;
  listeningModeRef.current = listeningMode;
  arabicRepeatRef.current = arabicRepeatCount;
  urduRepeatRef.current = urduRepeatCount;
  continuousRef.current = continuousSurahPlayback;
  surahRef.current = surah;
  speedRef.current = speed;
  volumeRef.current = volume;
  customBaseRef.current = customAudioBaseUrl;

  useEffect(() => {
    if (surah) {
      setRangeStart(1);
      setRangeEnd(Math.min(7, surah.verses.length));
    }
  }, [surah?.surahId]);

  const updateWordHighlightFromTime = useCallback((timeSec: number) => {
    const verse = activeVerseRef.current;
    if (!verse || activeTrackRoleRef.current !== 'arabic') {
      if (activeWordPosRef.current !== null) {
        activeWordPosRef.current = null;
        setActiveWordPos(null);
      }
      return;
    }
    const nextPos = findActiveWordPosition(verse.words, timeSec);
    if (nextPos !== activeWordPosRef.current) {
      activeWordPosRef.current = nextPos;
      setActiveWordPos(nextPos);
    }
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startRaf = useCallback(() => {
    stopRaf();
    const tick = () => {
      const audio = audioRef.current;
      if (!audio) return;

      const t = audio.currentTime;
      setCurrentTime(t);

      const seg = wordSegmentRef.current;
      if (seg && t >= seg.end) {
        if (seg.loop || repeatModeRef.current === 'word') {
          audio.currentTime = Math.max(0, seg.start - 0.03);
        } else {
          audio.pause();
          wordSegmentRef.current = null;
          setIsPlaying(false);
          return;
        }
      }

      updateWordHighlightFromTime(audio.currentTime);

      if (!audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf, updateWordHighlightFromTime]);

  const loadAndPlayVerseTrack = useCallback(
    async (
      verse: QuranVerse,
      track: AudioTrackRole,
      options?: {startSec?: number; wordSegment?: {start: number; end: number; loop: boolean}},
    ) => {
      const audio = audioRef.current;
      if (!audio) return;

      const seq = ++loadSeqRef.current;
      setAudioError(null);
      setIsBuffering(true);
      wordSegmentRef.current = options?.wordSegment || null;

      const isSameVerseAndTrack =
        activeVerseRef.current?.verseKey === verse.verseKey &&
        activeTrackRoleRef.current === track &&
        Boolean(audio.src);

      activeVerseRef.current = verse;
      activeTrackRoleRef.current = track;
      setPlayingVerseKey(verse.verseKey);
      setActiveTrackRole(track);

      if (track === 'urdu') {
        activeWordPosRef.current = null;
        setActiveWordPos(null);
      }

      try {
        if (!isSameVerseAndTrack) {
          const streamUrl = resolveStreamingAudioUrl(verse, track, customBaseRef.current);
          if (seq !== loadSeqRef.current) return;
          audio.src = streamUrl;
          audio.load();
        }

        audio.playbackRate = speedRef.current;
        audio.volume = volumeRef.current;

        if (typeof options?.startSec === 'number') {
          const seekTarget = Math.max(0, options.startSec);
          if (audio.readyState >= 1) {
            audio.currentTime = seekTarget;
          } else {
            await new Promise<void>((resolve) => {
              const onMeta = () => {
                audio.removeEventListener('loadedmetadata', onMeta);
                audio.currentTime = seekTarget;
                resolve();
              };
              audio.addEventListener('loadedmetadata', onMeta, {once: true});
            });
          }
        } else if (!isSameVerseAndTrack) {
          audio.currentTime = 0;
        }

        if (seq !== loadSeqRef.current) return;
        await audio.play();
        setIsPlaying(true);
        setIsBuffering(false);
        startRaf();

        const [sStr] = verse.verseKey.split(':');
        const sId = Number(sStr);
        const meta = getSurahMeta(sId);
        pushRecentSurahId(sId).catch(() => {});
        addHistoryEntry('playbackHistory', {
          surahId: sId,
          ayahNumber: verse.verseNumber,
          surahName: meta.nameSimple,
          timestamp: Date.now(),
        }).catch(() => {});
        onAyahPlayed?.(verse);
      } catch (err) {
        if (seq !== loadSeqRef.current) return;
        setIsPlaying(false);
        setIsBuffering(false);
        const offlineHint =
          typeof navigator !== 'undefined' && !navigator.onLine
            ? 'Streaming audio requires an active internet connection (streaming-only mode).'
            : track === 'urdu'
              ? 'Unable to stream Shamshad Ali Khan Urdu translation audio for this Ayah.'
              : 'Unable to stream Sheikh Fares Abbad audio for this Ayah.';
        setAudioError(
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Tap Play to start streaming audio.'
            : offlineHint,
        );
      }
    },
    [onAyahPlayed, startRaf],
  );

  // Initialize single persistent <audio> streaming element (controlsList nodownload)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      audio.playbackRate = speedRef.current;
      audio.volume = volumeRef.current;
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
      audio.playbackRate = speedRef.current;
      startRaf();
    };
    const handlePause = () => {
      setIsPlaying(false);
      stopRaf();
      updateWordHighlightFromTime(audio.currentTime);
    };
    const handleSeeked = () => {
      setCurrentTime(audio.currentTime);
      updateWordHighlightFromTime(audio.currentTime);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.paused) {
        updateWordHighlightFromTime(audio.currentTime);
      }
    };
    const handleError = () => {
      setIsBuffering(false);
      setIsPlaying(false);
      stopRaf();
      const offlineMsg =
        typeof navigator !== 'undefined' && !navigator.onLine
          ? 'Offline: Streaming audio requires an internet connection.'
          : 'Audio stream interrupted or unavailable.';
      setAudioError(offlineMsg);
    };

    const advanceAfterVerseCycle = (currVerse: QuranVerse, currSurah: SurahPayload) => {
      const startTrackForMode: AudioTrackRole =
        listeningModeRef.current === 'urdu-only' ? 'urdu' : 'arabic';
      arabicDoneRef.current = 0;
      urduDoneRef.current = 0;

      const rMode = repeatModeRef.current;
      if (rMode === 'ayah') {
        loadAndPlayVerseTrack(currVerse, startTrackForMode, {startSec: 0});
        return;
      }
      if (rMode === 'ayah-3x') {
        const count = ayahRepeatCounterRef.current + 1;
        if (count < 3) {
          setAyahRepeatCounter(count);
          loadAndPlayVerseTrack(currVerse, startTrackForMode, {startSec: 0});
          return;
        }
        setAyahRepeatCounter(0);
      }

      if (rMode === 'range') {
        const {start, end} = rangeRef.current;
        const minAyah = Math.min(start, end);
        const maxAyah = Math.max(start, end);
        if (currVerse.verseNumber < maxAyah) {
          const nextV = currSurah.verses.find((v) => v.verseNumber === currVerse.verseNumber + 1);
          if (nextV) {
            onSelectSurahAndAyah(currSurah.surahId, nextV.verseNumber);
            loadAndPlayVerseTrack(nextV, startTrackForMode, {startSec: 0});
            return;
          }
        } else {
          const loopV = currSurah.verses.find((v) => v.verseNumber === minAyah);
          if (loopV) {
            onSelectSurahAndAyah(currSurah.surahId, loopV.verseNumber);
            loadAndPlayVerseTrack(loopV, startTrackForMode, {startSec: 0});
            return;
          }
        }
      }

      if (continuousRef.current) {
        const idx = currSurah.verses.findIndex((v) => v.verseNumber === currVerse.verseNumber);
        if (idx >= 0 && idx + 1 < currSurah.verses.length) {
          const nextVerse = currSurah.verses[idx + 1];
          onSelectSurahAndAyah(currSurah.surahId, nextVerse.verseNumber);
          loadAndPlayVerseTrack(nextVerse, startTrackForMode, {startSec: 0});
        } else if (currSurah.surahId < 114) {
          onSelectSurahAndAyah(currSurah.surahId + 1, 1);
        }
      }
    };

    const handleEnded = () => {
      stopRaf();
      setIsPlaying(false);
      activeWordPosRef.current = null;
      setActiveWordPos(null);

      const currVerse = activeVerseRef.current;
      const currSurah = surahRef.current;
      if (!currVerse || !currSurah) return;

      const lMode = listeningModeRef.current;
      const currTrack = activeTrackRoleRef.current;

      if (currTrack === 'arabic') {
        arabicDoneRef.current += 1;
        if (arabicDoneRef.current < arabicRepeatRef.current) {
          loadAndPlayVerseTrack(currVerse, 'arabic', {startSec: 0});
          return;
        }
        if (lMode === 'combined') {
          urduDoneRef.current = 0;
          loadAndPlayVerseTrack(currVerse, 'urdu', {startSec: 0});
          return;
        }
        advanceAfterVerseCycle(currVerse, currSurah);
        return;
      }

      if (currTrack === 'urdu') {
        urduDoneRef.current += 1;
        if (urduDoneRef.current < urduRepeatRef.current) {
          loadAndPlayVerseTrack(currVerse, 'urdu', {startSec: 0});
          return;
        }
        advanceAfterVerseCycle(currVerse, currSurah);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      stopRaf();
      audio.pause();
      audio.src = '';
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [loadAndPlayVerseTrack, onSelectSurahAndAyah, startRaf, stopRaf, updateWordHighlightFromTime]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playVerse = useCallback(
    async (verse: QuranVerse, forcedTrack?: AudioTrackRole) => {
      setAyahRepeatCounter(0);
      arabicDoneRef.current = 0;
      urduDoneRef.current = 0;
      const track: AudioTrackRole =
        forcedTrack || (listeningModeRef.current === 'urdu-only' ? 'urdu' : 'arabic');
      await loadAndPlayVerseTrack(verse, track, {startSec: 0});
    },
    [loadAndPlayVerseTrack],
  );

  const togglePlayPause = useCallback(
    async (fallbackVerse?: QuranVerse) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
        return;
      }

      if (activeVerseRef.current && audio.src) {
        wordSegmentRef.current = null;
        try {
          await audio.play();
        } catch {
          if (fallbackVerse) {
            await playVerse(fallbackVerse);
          }
        }
        return;
      }

      const target = fallbackVerse || surah?.verses[0];
      if (target) {
        await playVerse(target);
      }
    },
    [isPlaying, playVerse, surah],
  );

  const playWordSegment = useCallback(
    async (verse: QuranVerse, word: QuranWord, loop = false) => {
      if (word.start === null || word.end === null) {
        setAudioError('Word-level timestamp is unavailable for this word.');
        return;
      }
      activeWordPosRef.current = word.position;
      setActiveWordPos(word.position);
      await loadAndPlayVerseTrack(verse, 'arabic', {
        startSec: Math.max(0, word.start - 0.03),
        wordSegment: {start: word.start, end: word.end + 0.05, loop},
      });
    },
    [loadAndPlayVerseTrack],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio || !audio.src) return;
      wordSegmentRef.current = null;
      const clamped = Math.max(0, Math.min(seconds, audio.duration || seconds));
      audio.currentTime = clamped;
      setCurrentTime(clamped);
      updateWordHighlightFromTime(clamped);
    },
    [updateWordHighlightFromTime],
  );

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    wordSegmentRef.current = null;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    activeWordPosRef.current = null;
    setActiveWordPos(null);
  }, []);

  return {
    playingVerseKey,
    activeTrackRole,
    isPlaying,
    isBuffering,
    audioError,
    currentTime,
    duration,
    activeWordPos,
    repeatMode,
    setRepeatMode,
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    ayahRepeatCounter,
    togglePlayPause,
    playVerse,
    playWordSegment,
    seekTo,
    stopAudio,
  };
}
