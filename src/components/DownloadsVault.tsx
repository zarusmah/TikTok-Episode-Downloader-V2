import React from 'react';
import { SavedOfflineVideo } from '../types/tiktok';
import { formatBytes, downloadBlobToDisk } from '../utils/storage';
import { X, Play, Download, Trash2, HardDrive, AlertCircle } from 'lucide-react';

interface DownloadsVaultProps {
  isOpen: boolean;
  onClose: () => void;
  savedVideos: SavedOfflineVideo[];
  totalBytes: number;
  onPlayOfflineVideo: (video: SavedOfflineVideo) => void;
  onDeleteVideo: (id: string) => void;
  onClearAll: () => void;
}

export const DownloadsVault: React.FC<DownloadsVaultProps> = ({
  isOpen,
  onClose,
  savedVideos,
  totalBytes,
  onPlayOfflineVideo,
  onDeleteVideo,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Local Offline Vault</span>
                <span className="text-xs font-mono font-normal text-neutral-400">
                  ({savedVideos.length} videos)
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Videos saved directly in your browser's persistent local storage. Playable without internet.
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

        {/* Storage Bar Strip */}
        <div className="px-6 py-2.5 bg-neutral-950/50 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span>Total Stored:</span>
            <span className="font-mono font-semibold text-rose-400">{formatBytes(totalBytes)}</span>
          </div>

          {savedVideos.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Storage</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          {savedVideos.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center text-neutral-400 gap-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-neutral-300">No Videos Saved Yet</h4>
                <p className="text-xs text-neutral-500 max-w-sm mt-1">
                  Click the "Save to Offline Storage" button on any episode card to keep the video saved inside your browser for instant offline watching.
                </p>
              </div>
            </div>
          ) : (
            savedVideos.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors group"
              >
                {/* Thumbnail & Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-14 aspect-[9/13] rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800 shrink-0">
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                        <Play className="w-4 h-4 text-neutral-600" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      {item.episodeNumber && (
                        <span className="text-[11px] font-mono font-bold text-rose-400">
                          Ep. {item.episodeNumber}
                        </span>
                      )}
                      <h4 className="text-sm font-semibold text-white truncate">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                      <span>{item.dramaTitle || `@${item.author}`}</span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span>{formatBytes(item.sizeBytes)}</span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span className="text-neutral-500">{formatDate(item.savedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onPlayOfflineVideo(item)}
                    title="Play Offline Video"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-white hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Play Offline</span>
                  </button>

                  <button
                    onClick={() =>
                      downloadBlobToDisk(
                        item.blob,
                        `${item.dramaTitle || 'drama'}_Ep${item.episodeNumber || 1}_no_watermark.mp4`
                      )
                    }
                    title="Save to Computer Disk"
                    className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteVideo(item.id)}
                    title="Delete from Local Storage"
                    className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3 bg-neutral-950 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span>
            Storage is managed locally in your web browser. Videos stay available offline and do not expire.
          </span>
        </div>
      </div>
    </div>
  );
};
