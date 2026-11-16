import React from 'react';
import {Bookmark, BookOpen, Home, List, Settings, Sparkles} from 'lucide-react';
import type {AppScreen, UserSettings} from '../types/quran';
import {UI_COPY} from '../data/i18n';
import {OfflineIndicator} from './PWAHelpers';

interface AppShellProps {
  activeScreen: AppScreen;
  settings: UserSettings;
  onNavigate: (screen: AppScreen) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeScreen,
  settings,
  onNavigate,
  children,
}) => {
  const copy = UI_COPY[settings.language];

  const desktopNav: Array<{id: AppScreen; label: string}> = [
    {id: 'home', label: copy.navHome},
    {id: 'index', label: copy.navIndex},
    {id: 'read', label: copy.navRead},
    {id: 'tajweed', label: copy.navTajweed},
    {id: 'bookmarks', label: copy.navBookmarks},
  ];

  const mobileTabs: Array<{id: AppScreen; label: string; icon: React.ComponentType<{className?: string}>}> = [
    {id: 'home', label: copy.navHome, icon: Home},
    {id: 'index', label: copy.navIndex, icon: List},
    {id: 'read', label: copy.navRead, icon: BookOpen},
    {id: 'tajweed', label: copy.navTajweed, icon: Sparkles},
    {id: 'bookmarks', label: copy.navBookmarks, icon: Bookmark},
  ];

  const isReadFamily = (id: AppScreen) =>
    id === 'read' && (activeScreen === 'read' || activeScreen === 'word' || activeScreen === 'translation');

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Desktop & Mobile Top Navigation Bar (Strict 3-Zone Contract on Desktop) */}
      <header className="sticky top-0 z-30 h-14 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
          >
            {copy.brand}
          </button>

          {/* Zone 2: Clean Single-line Nav Links */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
            {desktopNav.map((item) => {
              const active = activeScreen === item.id || isReadFamily(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-[var(--accent-emerald)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute right-0 -bottom-1 left-0 h-0.5 rounded-full bg-[var(--accent-emerald)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label={copy.navSettings}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeScreen === 'settings'
                  ? 'bg-[var(--accent-emerald)] text-white'
                  : 'bg-[var(--bg-surface-muted)] text-[var(--text-primary)] hover:bg-[var(--accent-emerald)] hover:text-white'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>{copy.navSettings}</span>
            </button>
          </div>
        </div>
      </header>

      <OfflineIndicator text={copy.offlineBanner} />

      {/* Main Content Area with bottom clearance for AudioPlayerBar + Mobile Nav */}
      <main className="flex-1 pb-40 md:pb-28">{children}</main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed right-0 bottom-0 left-0 z-40 grid h-16 grid-cols-5 items-center border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md md:hidden"
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeScreen === tab.id || isReadFamily(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 ${
                active ? 'text-[var(--accent-emerald)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
