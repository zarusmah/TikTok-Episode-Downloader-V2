import React, { useState } from 'react';
import { DramaInfo, EpisodeItem } from '../types/tiktok';
import { Download, Play, HardDrive, Check, ChevronDown, ChevronUp, Sparkles, Layers } from 'lucide-react';

interface DramaHeroProps {
  dramaInfo: DramaInfo;
  selectedEpisode: EpisodeItem;
  totalEpisodes: number;
  onPlayEpisode: (episode: EpisodeItem) => void;
  onDownloadEpisode: (episode: EpisodeItem) => void;
  onSaveToLocalStorage: (episode: EpisodeItem) => void;
  onDownloadAll: () => void;
  isDownloading: boolean;
  isSaving: boolean;
  isSavedLocally: boolean;
}

export const DramaHero: React.FC<DramaHeroProps> = ({
  dramaInfo,
  selectedEpisode,
  totalEpisodes,
  onPlayEpisode,
  onDownloadEpisode,
  onSaveToLocalStorage,
  onDownloadAll,
  isDownloading,
  isSaving,
  isSavedLocally,
}) => {
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);

  const formatViews = (val: string | number) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTotalTime = (secondsStr: string) => {
    const sec = parseInt(secondsStr, 10);
    if (isNaN(sec)) return secondsStr;
    const mins = Math.floor(sec / 60);
    return `${mins} min`;
  };

  const coverImage =
    selectedEpisode.coverUrl ||
    dramaInfo.cover?.urlList?.[0] ||
    dramaInfo.zoomCover?.['720'] ||
    '';

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 lg:p-8 backdrop-blur-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cover / Poster Preview */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="relative w-full max-w-[280px] aspect-[9/14] rounded-xl overflow-hidden shadow-2xl shadow-black/80 border border-neutral-700/60 group bg-neutral-950">
            {coverImage ? (
              <img
                src={coverImage}
                alt={dramaInfo.dramaName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-neutral-900 to-neutral-950">
                <Layers className="w-10 h-10 text-neutral-600 mb-2" />
                <span className="text-xs text-neutral-500">TikTok Short Drama</span>
              </div>
            )}

            {/* Gradient Scrim for Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent pointer-events-none" />

            {/* Bottom Floating Play Badge */}
            <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-auto">
              <button
                onClick={() => onPlayEpisode(selectedEpisode)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/95 hover:bg-white text-neutral-950 font-semibold text-xs rounded-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Preview Ep. {selectedEpisode.episodeNumber}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Series Information & Primary Controls */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Creator & Sub-Kicker */}
          <div className="flex items-center gap-3">
            {dramaInfo.author?.user?.avatarLarger && (
              <img
                src={dramaInfo.author.user.avatarLarger}
                alt={dramaInfo.author.user.nickname}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-neutral-700"
              />
            )}
            <div>
              <div className="text-xs font-semibold text-neutral-200">
                {dramaInfo.author?.user?.nickname || 'TikTok Creator'}
              </div>
              <div className="text-xs text-neutral-400">
                @{dramaInfo.author?.user?.uniqueId || selectedEpisode.authorUniqueId}
              </div>
            </div>
          </div>

          {/* Drama Title */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {dramaInfo.dramaName}
            </h1>

            {/* Zero-Pill Unboxed Metadata */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-neutral-400 mt-2 font-medium">
              <span className="text-rose-400 font-semibold">
                Episode {selectedEpisode.episodeNumber} of {totalEpisodes}
              </span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>{totalEpisodes} Episodes Total</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>{formatTotalTime(dramaInfo.totalDuration)} Runtime</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>{formatViews(dramaInfo.numWatched)} Views</span>
              {dramaInfo.author?.stats?.heartCount && (
                <>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span>{formatViews(dramaInfo.author.stats.heartCount)} Likes</span>
                </>
              )}
            </div>
          </div>

          {/* Synopsis */}
          <div className="text-sm text-neutral-300 leading-relaxed bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
            <p className={showFullSynopsis ? '' : 'line-clamp-3'}>
              {dramaInfo.description || 'No description available for this drama series.'}
            </p>
            {dramaInfo.description && dramaInfo.description.length > 180 && (
              <button
                onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                className="mt-2 text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showFullSynopsis ? (
                  <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Read Full Synopsis <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>

          {/* Themes / Genres (Unboxed text metadata with slash separators) */}
          {dramaInfo.themes && dramaInfo.themes.length > 0 && (
            <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-2">
              <span className="text-neutral-500 uppercase tracking-wider text-[11px] font-semibold">Genres:</span>
              {dramaInfo.themes.map((theme, i) => (
                <React.Fragment key={theme.tagID || i}>
                  <span className="text-neutral-300 font-medium">{theme.tagVal}</span>
                  {i < dramaInfo.themes!.length - 1 && (
                    <span aria-hidden="true" className="text-neutral-600">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Primary Action Row */}
          <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-3">
            {/* Primary Download MP4 */}
            <button
              onClick={() => onDownloadEpisode(selectedEpisode)}
              disabled={isDownloading}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-rose-950/50 hover:shadow-rose-900/40 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>
                {isDownloading ? 'Resolving & Downloading...' : `Download Episode ${selectedEpisode.episodeNumber} (MP4)`}
              </span>
            </button>

            {/* Save into Local Storage (IndexedDB) */}
            <button
              onClick={() => onSaveToLocalStorage(selectedEpisode)}
              disabled={isSaving || isSavedLocally}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60 text-neutral-200 hover:text-white font-medium text-sm rounded-xl border border-neutral-700/80 transition-colors cursor-pointer whitespace-nowrap"
            >
              {isSavedLocally ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Saved in Local Storage</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-rose-400" />
                  <span>{isSaving ? 'Saving to Storage...' : 'Save to Offline Storage'}</span>
                </>
              )}
            </button>

            {/* Download All Queue */}
            <button
              onClick={onDownloadAll}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-medium text-xs rounded-xl border border-neutral-800 transition-colors cursor-pointer whitespace-nowrap ml-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Download Series ({totalEpisodes} eps)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
