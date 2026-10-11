import React, { useState, useMemo } from 'react';
import { EpisodeItem } from '../types/tiktok';
import { Play, Download, HardDrive, Check, Search, CheckSquare, Square } from 'lucide-react';

interface EpisodeGridProps {
  episodes: EpisodeItem[];
  selectedEpisode: EpisodeItem;
  onSelectEpisode: (episode: EpisodeItem) => void;
  onPlayEpisode: (episode: EpisodeItem) => void;
  onDownloadEpisode: (episode: EpisodeItem) => void;
  onSaveToLocalStorage: (episode: EpisodeItem) => void;
  savedVideoIds: Set<string>;
  downloadingVideoId: string | null;
  savingVideoId: string | null;
  onBatchDownloadSelected: (selectedEpisodes: EpisodeItem[]) => void;
}

export const EpisodeGrid: React.FC<EpisodeGridProps> = ({
  episodes,
  selectedEpisode,
  onSelectEpisode,
  onPlayEpisode,
  onDownloadEpisode,
  onSaveToLocalStorage,
  savedVideoIds,
  downloadingVideoId,
  savingVideoId,
  onBatchDownloadSelected,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRange, setSelectedRange] = useState<string>('all');
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(new Set());

  // Generate range tabs based on total episodes
  const ranges = useMemo(() => {
    const list: { id: string; label: string; min: number; max: number }[] = [
      { id: 'all', label: 'All Episodes', min: 1, max: 9999 },
    ];
    if (episodes.length > 10) {
      for (let i = 1; i <= episodes.length; i += 10) {
        const end = Math.min(i + 9, episodes.length);
        list.push({
          id: `${i}-${end}`,
          label: `${i}–${end}`,
          min: i,
          max: end,
        });
      }
    }
    return list;
  }, [episodes.length]);

  const filteredEpisodes = useMemo(() => {
    return episodes.filter((ep) => {
      // Range check
      if (selectedRange !== 'all') {
        const currentRange = ranges.find((r) => r.id === selectedRange);
        if (currentRange) {
          if (ep.episodeNumber < currentRange.min || ep.episodeNumber > currentRange.max) {
            return false;
          }
        }
      }
      // Search check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = ep.episodeNumber.toString().includes(q);
        const descMatch = ep.desc.toLowerCase().includes(q);
        return numMatch || descMatch;
      }
      return true;
    });
  }, [episodes, selectedRange, searchQuery, ranges]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleSelectAll = () => {
    if (selectedEpisodeIds.size === filteredEpisodes.length) {
      setSelectedEpisodeIds(new Set());
    } else {
      setSelectedEpisodeIds(new Set(filteredEpisodes.map((e) => e.id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedEpisodeIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEpisodeIds(next);
  };

  const handleStartBatchDownload = () => {
    const toDownload = episodes.filter((ep) => selectedEpisodeIds.has(ep.id));
    if (toDownload.length > 0) {
      onBatchDownloadSelected(toDownload);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header and Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Series Episodes</span>
            <span className="text-xs font-mono font-medium text-neutral-400">
              ({filteredEpisodes.length} of {episodes.length})
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Select an episode to inspect, preview watermark-free, or download as high-definition MP4.
          </p>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative w-40 sm:w-48">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search episode #"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-rose-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
            />
          </div>

          {/* Select All Toggle */}
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            {selectedEpisodeIds.size === filteredEpisodes.length && filteredEpisodes.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-neutral-400" />
            )}
            <span>Select All</span>
          </button>

          {/* Batch Download Trigger */}
          {selectedEpisodeIds.size > 0 && (
            <button
              onClick={handleStartBatchDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-md shadow-rose-950/40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Selected ({selectedEpisodeIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Range Tabs (functional button filters) */}
      {ranges.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ranges.map((r) => {
            const isActive = selectedRange === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRange(r.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid of Episode Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {filteredEpisodes.map((ep) => {
          const isSelected = selectedEpisode.id === ep.id;
          const isLocallySaved = savedVideoIds.has(ep.id);
          const isDownloading = downloadingVideoId === ep.id;
          const isSaving = savingVideoId === ep.id;
          const isChecked = selectedEpisodeIds.has(ep.id);

          return (
            <div
              key={ep.id}
              onClick={() => onSelectEpisode(ep)}
              className={`group relative flex flex-col bg-neutral-900/80 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                isSelected
                  ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-lg shadow-rose-950/30'
                  : 'border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[9/13] w-full overflow-hidden bg-neutral-950">
                {ep.coverUrl ? (
                  <img
                    src={ep.coverUrl}
                    alt={ep.desc}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-700 bg-neutral-950">
                    <Play className="w-8 h-8 opacity-40" />
                  </div>
                )}

                {/* Scrim Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-black/30 pointer-events-none" />

                {/* Top Select Checkbox */}
                <button
                  onClick={(e) => toggleSelectOne(ep.id, e)}
                  className="absolute top-2 left-2 p-1 rounded bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm transition-colors cursor-pointer z-10"
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Square className="w-4 h-4 text-neutral-400 opacity-80 group-hover:opacity-100" />
                  )}
                </button>

                {/* Duration Label */}
                <div className="absolute top-2 right-2 text-[10px] font-mono font-medium text-neutral-200 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded">
                  {formatDuration(ep.duration)}
                </div>

                {/* Episode Badge Floating */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate drop-shadow-md">
                    Ep. {ep.episodeNumber}
                  </span>
                  {isLocallySaved && (
                    <span
                      title="Saved locally in browser storage"
                      className="p-1 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-700/50"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Center Hover Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayEpisode(ep);
                  }}
                  className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl cursor-pointer hover:scale-110"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>

              {/* Action Strip on Card Bottom */}
              <div className="p-2.5 flex items-center justify-between gap-1 border-t border-neutral-800/80 bg-neutral-950/50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadEpisode(ep);
                  }}
                  disabled={isDownloading}
                  title="Download MP4 to disk"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-neutral-800 hover:bg-rose-600 text-neutral-200 hover:text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  <span>{isDownloading ? '...' : 'MP4'}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveToLocalStorage(ep);
                  }}
                  disabled={isSaving || isLocallySaved}
                  title={isLocallySaved ? 'Saved locally' : 'Save to browser storage'}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isLocallySaved ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <HardDrive className="w-3.5 h-3.5 text-neutral-300" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEpisodes.length === 0 && (
        <div className="py-12 text-center text-neutral-400 bg-neutral-900/30 rounded-xl border border-neutral-800">
          <p className="text-sm">No episodes match your search query or filter range.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRange('all');
            }}
            className="mt-2 text-xs font-medium text-rose-400 hover:text-rose-300 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
