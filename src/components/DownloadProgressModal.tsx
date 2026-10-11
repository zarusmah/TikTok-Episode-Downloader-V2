import React from 'react';
import { EpisodeItem } from '../types/tiktok';
import { formatBytes } from '../utils/storage';
import { Loader2, CheckCircle2, AlertCircle, X, Download } from 'lucide-react';

export interface BatchItemStatus {
  episode: EpisodeItem;
  status: 'pending' | 'resolving' | 'downloading' | 'completed' | 'error';
  errorMessage?: string;
  itemProgress?: number;
  loadedBytes?: number;
  totalBytes?: number;
}

interface DownloadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: BatchItemStatus[];
  currentIndex: number;
  isProcessing: boolean;
  onCancel: () => void;
}

export const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  isOpen,
  onClose,
  queue,
  currentIndex,
  isProcessing,
  onCancel,
}) => {
  if (!isOpen) return null;

  const completedCount = queue.filter((i) => i.status === 'completed').length;
  const progressPercent = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0;
  const isFinished = !isProcessing && (completedCount === queue.length || queue.length === 0);

  const currentItem = queue[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[82vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-600/40 flex items-center justify-center text-rose-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {isFinished ? 'Batch Download Complete' : 'Downloading Episodes...'}
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                {completedCount} of {queue.length} files saved ({progressPercent}%)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Progress Bar */}
        <div className="px-6 py-4 bg-neutral-950/50 border-b border-neutral-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>Overall Progress</span>
            <span className="text-white font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Current Item Real-time Progress */}
          {isProcessing && currentItem && currentItem.status === 'downloading' && (
            <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-rose-400">
              <span>
                Ep. {currentItem.episode.episodeNumber}:{' '}
                {currentItem.totalBytes && currentItem.totalBytes > 0
                  ? `${formatBytes(currentItem.loadedBytes || 0)} / ${formatBytes(currentItem.totalBytes)}`
                  : 'Transferring MP4 data...'}
              </span>
              <span>{currentItem.itemProgress || 0}%</span>
            </div>
          )}
        </div>

        {/* List of queue items */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
          {queue.map((item, index) => {
            const isCurrent = index === currentIndex && isProcessing;
            return (
              <div
                key={item.episode.id}
                className={`flex flex-col p-2.5 rounded-lg border text-xs transition-colors ${
                  item.status === 'completed'
                    ? 'bg-neutral-950/40 border-neutral-800/60 text-neutral-300'
                    : item.status === 'downloading' || item.status === 'resolving'
                    ? 'bg-rose-950/20 border-rose-800/60 text-white font-medium'
                    : item.status === 'error'
                    ? 'bg-red-950/20 border-red-900/60 text-red-300'
                    : 'bg-neutral-950/20 border-neutral-900 text-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-rose-400 shrink-0">
                      Ep. {item.episode.episodeNumber}
                    </span>
                    <span className="truncate">{item.episode.desc || `Episode ${item.episode.episodeNumber}`}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {(item.status === 'resolving' || item.status === 'downloading') && (
                      <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[11px]">
                        <span>{item.itemProgress ? `${item.itemProgress}%` : '...'}</span>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      </div>
                    )}
                    {item.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    {item.status === 'pending' && (
                      <span className="text-[11px] text-neutral-500 font-mono">Waiting</span>
                    )}
                  </div>
                </div>

                {/* Sub-bar for current downloading item */}
                {isCurrent && item.status === 'downloading' && item.itemProgress !== undefined && (
                  <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-rose-500 transition-all duration-150 rounded-full"
                      style={{ width: `${item.itemProgress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {isProcessing ? 'Downloading in progress...' : 'Finished processing queue'}
          </span>

          {isProcessing ? (
            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel Queue
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
