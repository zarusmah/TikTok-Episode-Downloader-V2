import React from 'react';
import { HardDrive, PlaySquare } from 'lucide-react';

interface HeaderProps {
  savedCount: number;
  onOpenVault: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  savedCount,
  onOpenVault,
  onNavigateSection,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Single Wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
            <PlaySquare className="w-4 h-4 text-white" />
          </div>
          <span>TokDrama</span>
        </a>

        {/* Zone 2: Concise Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-400">
          <button
            onClick={() => onNavigateSection('downloader')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Downloader
          </button>
          <button
            onClick={() => onNavigateSection('how-it-works')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            How it Works
          </button>
          <button
            onClick={() => onNavigateSection('features')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Capabilities
          </button>
          <button
            onClick={() => onNavigateSection('faq')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenVault}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <HardDrive className="w-3.5 h-3.5 text-rose-400" />
            <span>Local Vault</span>
            {savedCount > 0 && (
              <span className="ml-1 text-[11px] font-mono font-medium text-rose-300">
                ({savedCount})
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
