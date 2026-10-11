import React from 'react';
import { formatBytes } from '../utils/storage';
import { Download, CheckCircle2, AlertCircle, X, Loader2, HardDrive } from 'lucide-react';

export interface ActiveDownloadState {
  episodeId: string;
  episodeNumber: number;
  title: string;
  coverUrl?: string;
  progress: number; // 0 to 100
  loadedBytes: number;
  totalBytes: number;
  status: 'connecting' | 'downloading' | 'saving' | 'completed' | 'error';
  errorMessage?: string;
}

interface DownloadProgressBarProps {
  downloadState: ActiveDownloadState | null;
  onDismiss: () => void;
}

export const DownloadProgressBar: React.FC<DownloadProgressBarProps> = ({
  downloadState,
  onDismiss,
}) => {
  if (!downloadState) return null;

  const isCompleted = downloadState.status === 'completed';
  const isError = downloadState.status === 'error';
  const isConnecting = downloadState.status === 'connecting';
  const isSaving = downloadState.status === 'saving';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-neutral-900/95 border border-neutral-750 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-black/80 flex flex-col gap-3">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {downloadState.coverUrl ? (
              <img
                src={downloadState.coverUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-10 h-12 rounded-lg object-cover bg-neutral-950 shrink-0 border border-neutral-800"
              />
            ) : (
              <div className="w-10 h-12 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 text-rose-400">
                <Download className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.2 rounded">
                  EP {downloadState.episodeNumber}
                </span>
                <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                  {downloadState.title}
                </h4>
              </div>

              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                {isConnecting && (
                  <>
                    <Loader2 className="w-3 h-3 text-rose-400 animate-spin" />
                    <span>Connecting to clean video stream...</span>
                  </>
                )}
                {downloadState.status === 'downloading' && (
                  <span>Downloading clean MP4 ({downloadState.progress}%)...</span>
                )}
                {isSaving && (
                  <>
                    <HardDrive className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>Saving file to disk & local storage...</span>
                  </>
                )}
                {isCompleted && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Downloaded & saved to your device!</span>
                  </span>
                )}
                {isError && (
                  <span className="text-red-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>{downloadState.errorMessage || 'Download failed'}</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar & Numerical Byte Metrics */}
        {!isError && (
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 rounded-full ${
                  isCompleted
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-rose-600 to-rose-400'
                }`}
                style={{ width: `${Math.max(downloadState.progress, isConnecting ? 10 : 0)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <span>
                {downloadState.totalBytes > 0
                  ? `${formatBytes(downloadState.loadedBytes)} / ${formatBytes(downloadState.totalBytes)}`
                  : downloadState.loadedBytes > 0
                  ? `${formatBytes(downloadState.loadedBytes)} transferred`
                  : 'Starting transfer...'}
              </span>
              <span className={isCompleted ? 'text-emerald-400 font-bold' : 'text-neutral-300'}>
                {downloadState.progress}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
