import React, {useEffect} from 'react';
import {ArrowRight} from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({onComplete}) => {
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(onComplete, prefersReduced ? 400 : 1400);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#082B1E] px-6 text-center text-[#FBFBF8]">
      <div className="flex max-w-md flex-col items-center">
        <div className="mb-8 h-32 w-32 overflow-hidden rounded-3xl border border-[#C9A227]/35 bg-[#0B3B2B] shadow-2xl">
          <img
            src="/src/assets/images/quran_emblem_crest_1794804516765.jpg"
            alt="Al-Bayan Quran Geometric Crest"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>

        <p className="font-quran mb-3 text-3xl leading-relaxed text-[#E7C666]" dir="rtl">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </p>

        <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Al-Bayan Quran
        </h1>

        <p className="mt-3 text-sm text-[#B8CEC4]">
          Word-by-Word Synchronized Recitation · Sheikh Fares Abbad
        </p>

        <button
          type="button"
          onClick={onComplete}
          className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#D4AF37] px-6 py-2.5 text-sm font-semibold text-[#082B1E] transition-colors hover:bg-[#E2C258] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
        >
          <span>Enter Quran</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
