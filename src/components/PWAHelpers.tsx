import React, {useState} from 'react';
import {Download, Share, WifiOff} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';
import {useOnlineStatus} from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC<{label?: string}> = ({label = 'Install App'}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--accent-emerald)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-emerald-hover)] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4" />
        <span>{label}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-muted)] whitespace-nowrap shrink-0"
        >
          <Share className="h-4 w-4" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-xl">
              <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Install on iPhone or iPad
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 min-h-[44px] w-full rounded-xl bg-[var(--accent-emerald)] py-2.5 text-sm font-medium text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC<{text: string}> = ({text}) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/60 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        <span>{text}</span>
      </div>
    </div>
  );
};
