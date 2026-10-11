import React from 'react';
import { Sparkles, HardDrive, Film, ShieldCheck, Zap, Download } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Film,
      title: 'Watermark-Free MP4 Extraction',
      description:
        'Downloads the clean original video master feed without any floating TikTok overlay logos, usernames, or end-screen cards.',
    },
    {
      icon: HardDrive,
      title: 'Direct Local Storage Vault',
      description:
        'Saves actual video binary files directly to your device and browser IndexedDB so you can watch your favorite episodes completely offline.',
    },
    {
      icon: Sparkles,
      title: 'Full Drama Series Parsing',
      description:
        'Paste any short drama episode link (e.g. Episode 1) and automatically retrieve the entire 30–80+ episode series catalog in seconds.',
    },
    {
      icon: Download,
      title: 'Single or Batch Download',
      description:
        'Grab individual episodes with one click or queue up selected batches to download the entire drama series directly to your computer.',
    },
    {
      icon: Zap,
      title: 'High-Bitrate Range Streaming',
      description:
        'Integrated in-browser video player with custom timeline scrubbing, variable playback speeds (0.75x–2x), and instant preview.',
    },
    {
      icon: ShieldCheck,
      title: 'Universal URL Support',
      description:
        'Works with TikTok short drama links, mini-series, web desktop URLs, mobile share links (vt.tiktok.com), and standard creator videos.',
    },
  ];

  return (
    <section id="features" className="py-12 border-t border-neutral-800/80">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Engineered for TikTok Short Dramas
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
          Unlike standard downloaders that fail on mini-series routes, TokDrama natively parses TikTok's episodic catalog architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col gap-3 hover:border-neutral-750 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-rose-400 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{feat.title}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">{feat.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
