import React, { useRef, useState, useEffect } from 'react';
import { EpisodeItem } from '../types/tiktok';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  HardDrive,
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Loader2,
} from 'lucide-react';

interface VideoPlayerModalProps {
  episode: EpisodeItem;
  allEpisodes: EpisodeItem[];
  streamUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectEpisode: (ep: EpisodeItem) => void;
  onDownload: (ep: EpisodeItem) => void;
  onSaveLocally: (ep: EpisodeItem) => void;
  isLocallySaved: boolean;
  isDownloading: boolean;
  isSaving: boolean;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  episode,
  allEpisodes,
  streamUrl,
  isOpen,
  onClose,
  onSelectEpisode,
  onDownload,
  onSaveLocally,
  isLocallySaved,
  isDownloading,
  isSaving,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentIndex = allEpisodes.findIndex((e) => e.id === episode.id);
  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isOpen, streamUrl]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded">
              EPISODE {episode.episodeNumber}
            </span>
            <h3 className="text-sm font-semibold text-white truncate max-w-md">
              {episode.desc || `Episode ${episode.episodeNumber}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] sm:min-h-[460px] overflow-hidden group">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/60 z-10">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <span className="text-xs text-neutral-400">Loading watermark-free video...</span>
            </div>
          )}

          <video
            ref={videoRef}
            src={streamUrl}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
            onClick={togglePlay}
            className="max-h-[60vh] w-auto max-w-full object-contain cursor-pointer"
          />

          {/* Episode Prev / Next Overlays */}
          {prevEpisode && (
            <button
              onClick={() => onSelectEpisode(prevEpisode)}
              title={`Previous: Episode ${prevEpisode.episodeNumber}`}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-lg hover:scale-110"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {nextEpisode && (
            <button
              onClick={() => onSelectEpisode(nextEpisode)}
              title={`Next: Episode ${nextEpisode.episodeNumber}`}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-lg hover:scale-110"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Custom Video Controls Strip */}
        <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800/80 flex flex-col gap-2">
          {/* Progress Timeline */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-neutral-400 w-9 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-neutral-800 accent-rose-500 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-neutral-400 w-9">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons Strip */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="p-1.5 text-neutral-200 hover:text-white rounded hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              {/* Mute / Unmute */}
              <button
                onClick={toggleMute}
                className="p-1.5 text-neutral-200 hover:text-white rounded hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Speed Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-neutral-300 hover:text-white rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5 text-rose-400" />
                  <span>{playbackSpeed}x</span>
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-1 left-0 bg-neutral-900 border border-neutral-750 rounded-lg shadow-xl p-1 z-30 flex flex-col min-w-[70px]">
                    {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`px-2 py-1 text-xs font-mono text-left rounded hover:bg-neutral-800 ${
                          playbackSpeed === s ? 'text-rose-400 font-bold' : 'text-neutral-300'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Download MP4 & Save Locally */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onSaveLocally(episode)}
                disabled={isSaving || isLocallySaved}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 border border-neutral-700/60 rounded-lg transition-colors cursor-pointer"
              >
                {isLocallySaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Saved Locally</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isSaving ? 'Saving...' : 'Save Locally'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onDownload(episode)}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? 'Downloading...' : 'Download MP4'}</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
