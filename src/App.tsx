/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { DramaHero } from './components/DramaHero';
import { EpisodeGrid } from './components/EpisodeGrid';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { DownloadsVault } from './components/DownloadsVault';
import { DownloadProgressModal, BatchItemStatus } from './components/DownloadProgressModal';
import { DownloadProgressBar, ActiveDownloadState } from './components/DownloadProgressBar';
import { FeaturesSection } from './components/FeaturesSection';
import { FaqSection } from './components/FaqSection';
import {
  ParsedTikTokResponse,
  EpisodeItem,
  SavedOfflineVideo,
  ResolvedVideoResponse,
} from './types/tiktok';
import {
  getSavedVideos,
  saveVideoToLocalStorage,
  deleteSavedVideo,
  getTotalStorageBytes,
  downloadBlobToDisk,
} from './utils/storage';
import {
  Search,
  Sparkles,
  Clipboard,
  AlertCircle,
  Loader2,
  HardDrive,
  Download,
  Film,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const EXAMPLE_LINK = 'https://www.tiktok.com/shortdrama/episode/7688817915797427252/1';

export default function App() {
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed Drama & Series State
  const [parsedData, setParsedData] = useState<ParsedTikTokResponse | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeItem | null>(null);

  // Player Modal State
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activePlayerEpisode, setActivePlayerEpisode] = useState<EpisodeItem | null>(null);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>('');

  // Offline Local Storage State
  const [savedVideos, setSavedVideos] = useState<SavedOfflineVideo[]>([]);
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // Download & Save Active Status
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [savingVideoId, setSavingVideoId] = useState<string | null>(null);
  const [activeDownload, setActiveDownload] = useState<ActiveDownloadState | null>(null);

  // Batch Queue State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchQueue, setBatchQueue] = useState<BatchItemStatus[]>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const batchCancelRef = useRef(false);

  // Load Saved Videos on Mount
  useEffect(() => {
    refreshSavedStorage();
  }, []);

  const refreshSavedStorage = async () => {
    try {
      const list = await getSavedVideos();
      setSavedVideos(list);
      const total = await getTotalStorageBytes();
      setTotalStorageBytes(total);
    } catch (err) {
      console.warn('Could not load local storage:', err);
    }
  };

  const savedVideoIds = new Set(savedVideos.map((v) => v.videoId));

  // Handle URL Parse & Fetch Drama
  const handleParseUrl = async (urlToFetch?: string) => {
    const target = (urlToFetch || inputUrl).trim();
    if (!target) {
      setError('Please enter a valid TikTok short drama or video link.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/drama/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });

      const data: ParsedTikTokResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse TikTok video link');
      }

      setParsedData(data);

      if (data.type === 'drama' && data.episodes && data.episodes.length > 0) {
        // Select targeted episode or Episode 1
        const targetNum = data.targetEpisodeNumber || 1;
        const matched =
          data.episodes.find((e) => e.episodeNumber === targetNum) || data.episodes[0];
        setSelectedEpisode(matched);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text);
        handleParseUrl(text);
      }
    } catch {
      // Fallback
    }
  };

  const handleLoadExample = () => {
    setInputUrl(EXAMPLE_LINK);
    handleParseUrl(EXAMPLE_LINK);
  };

  // Resolve a specific video to download/stream URLs (with safe parsing and retry)
  const resolveEpisodeVideo = async (
    episode: EpisodeItem,
    retryCount = 0
  ): Promise<ResolvedVideoResponse> => {
    try {
      const res = await fetch('/api/video/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: episode.id,
          authorUniqueId: episode.authorUniqueId,
          dramaTitle: parsedData?.dramaInfo?.dramaName || 'TikTok_Drama',
          episodeNumber: episode.episodeNumber,
          title: episode.desc,
        }),
      });

      const text = await res.text();
      let data: ResolvedVideoResponse;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Connection hiccup while resolving video stream. Retrying...');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to resolve video stream');
      }
      return data;
    } catch (err: any) {
      if (retryCount < 2) {
        await new Promise((r) => setTimeout(r, 1000));
        return resolveEpisodeVideo(episode, retryCount + 1);
      }
      throw err;
    }
  };

  // Helper: stream download video binary with live progress
  const streamDownloadVideoWithProgress = async (
    streamUrl: string,
    onProgress?: (percent: number, loaded: number, total: number) => void
  ): Promise<Blob> => {
    const res = await fetch(streamUrl);
    if (!res.ok) {
      throw new Error(`Video stream error: HTTP ${res.status}`);
    }

    const contentLength = res.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = res.body?.getReader();
    if (!reader) {
      const blob = await res.blob();
      onProgress?.(100, blob.size, blob.size);
      return blob;
    }

    const chunks: BlobPart[] = [];
    while (true) {
      if (batchCancelRef.current) {
        reader.cancel().catch(() => {});
        throw new Error('Download cancelled');
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        onProgress?.(percent, loaded, total);
      }
    }

    const blob = new Blob(chunks, { type: 'video/mp4' });
    onProgress?.(100, blob.size, blob.size);
    return blob;
  };

  // Download MP4 Directly to User File System with Live Progress Bar
  const handleDownloadEpisode = async (episode: EpisodeItem) => {
    setDownloadingVideoId(episode.id);

    const fallbackFilename = `${(parsedData?.dramaInfo?.dramaName || 'TikTok_Drama')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')}_Ep${String(episode.episodeNumber).padStart(2, '0')}_${(
      episode.authorUniqueId || 'creator'
    ).replace(/[^a-zA-Z0-9-_]/g, '')}_no_watermark.mp4`;

    try {
      // 1. Check if already stored in local IndexedDB vault
      const existing = savedVideos.find((v) => v.videoId === episode.id);
      if (existing && existing.blob) {
        setActiveDownload({
          episodeId: episode.id,
          episodeNumber: episode.episodeNumber,
          title: episode.desc || `Episode ${episode.episodeNumber}`,
          coverUrl: episode.coverUrl,
          progress: 100,
          loadedBytes: existing.sizeBytes,
          totalBytes: existing.sizeBytes,
          status: 'completed',
        });
        downloadBlobToDisk(existing.blob, fallbackFilename);
        return;
      }

      // 2. Set connecting state on progress bar
      setActiveDownload({
        episodeId: episode.id,
        episodeNumber: episode.episodeNumber,
        title: episode.desc || `Episode ${episode.episodeNumber}`,
        coverUrl: episode.coverUrl,
        progress: 10,
        loadedBytes: 0,
        totalBytes: 0,
        status: 'connecting',
      });

      // 3. Resolve video
      const resolved = await resolveEpisodeVideo(episode);
      const streamUrl = resolved.streamUrl || resolved.downloadUrl;
      if (!streamUrl) {
        throw new Error('No stream URL returned by resolver');
      }

      // 4. Stream video with live byte progress
      setActiveDownload((prev) =>
        prev ? { ...prev, progress: 20, status: 'downloading' } : null
      );

      const blob = await streamDownloadVideoWithProgress(
        streamUrl,
        (percent, loaded, total) => {
          setActiveDownload((prev) =>
            prev
              ? {
                  ...prev,
                  progress: Math.min(percent, 99),
                  loadedBytes: loaded,
                  totalBytes: total,
                  status: 'downloading',
                }
              : null
          );
        }
      );

      // 5. Trigger native browser file download with blob URL (completely avoids 403 Google proxy navigation error!)
      setActiveDownload((prev) => (prev ? { ...prev, status: 'saving' } : null));
      downloadBlobToDisk(blob, resolved.filename || fallbackFilename);

      // 6. Automatically save into local storage vault as well
      const savedItem: SavedOfflineVideo = {
        id: `ep_${episode.id}`,
        videoId: episode.id,
        dramaId: parsedData?.dramaInfo?.dramaID,
        dramaTitle: parsedData?.dramaInfo?.dramaName,
        episodeNumber: episode.episodeNumber,
        title: episode.desc || `Episode ${episode.episodeNumber}`,
        author: episode.authorUniqueId,
        coverUrl: episode.coverUrl,
        blob,
        sizeBytes: blob.size,
        duration: episode.duration,
        savedAt: Date.now(),
      };
      await saveVideoToLocalStorage(savedItem);
      await refreshSavedStorage();

      setActiveDownload((prev) =>
        prev
          ? {
              ...prev,
              progress: 100,
              loadedBytes: blob.size,
              totalBytes: blob.size,
              status: 'completed',
            }
          : null
      );
    } catch (err: any) {
      console.error('Download error:', err);
      setActiveDownload((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              errorMessage: err.message || 'Download failed',
            }
          : null
      );
    } finally {
      setDownloadingVideoId(null);
    }
  };

  // Save Video directly into Browser Local Storage (IndexedDB)
  const handleSaveToLocalStorage = async (episode: EpisodeItem) => {
    setSavingVideoId(episode.id);
    try {
      const resolved = await resolveEpisodeVideo(episode);
      if (!resolved.streamUrl) {
        throw new Error('No stream URL available');
      }

      // Fetch video binary as Blob with live progress
      setActiveDownload({
        episodeId: episode.id,
        episodeNumber: episode.episodeNumber,
        title: episode.desc || `Episode ${episode.episodeNumber}`,
        coverUrl: episode.coverUrl,
        progress: 15,
        loadedBytes: 0,
        totalBytes: 0,
        status: 'downloading',
      });

      const blob = await streamDownloadVideoWithProgress(
        resolved.streamUrl,
        (percent, loaded, total) => {
          setActiveDownload((prev) =>
            prev
              ? {
                  ...prev,
                  progress: Math.min(percent, 99),
                  loadedBytes: loaded,
                  totalBytes: total,
                }
              : null
          );
        }
      );

      const savedItem: SavedOfflineVideo = {
        id: `ep_${episode.id}`,
        videoId: episode.id,
        dramaId: parsedData?.dramaInfo?.dramaID,
        dramaTitle: parsedData?.dramaInfo?.dramaName,
        episodeNumber: episode.episodeNumber,
        title: episode.desc || `Episode ${episode.episodeNumber}`,
        author: episode.authorUniqueId,
        coverUrl: episode.coverUrl,
        blob,
        sizeBytes: blob.size,
        duration: episode.duration,
        savedAt: Date.now(),
      };

      await saveVideoToLocalStorage(savedItem);
      await refreshSavedStorage();

      setActiveDownload((prev) =>
        prev
          ? {
              ...prev,
              progress: 100,
              loadedBytes: blob.size,
              totalBytes: blob.size,
              status: 'completed',
            }
          : null
      );
    } catch (err: any) {
      alert(`Storage Error: ${err.message || 'Could not save video locally'}`);
      setActiveDownload((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              errorMessage: err.message || 'Storage save failed',
            }
          : null
      );
    } finally {
      setSavingVideoId(null);
    }
  };

  // Open Video Player Preview
  const handlePlayEpisode = async (episode: EpisodeItem) => {
    try {
      setSelectedEpisode(episode);
      setActivePlayerEpisode(episode);
      setIsPlayerOpen(true);

      // Check if already in local storage
      const local = savedVideos.find((v) => v.videoId === episode.id);
      if (local && local.blob) {
        const localBlobUrl = URL.createObjectURL(local.blob);
        setActiveStreamUrl(localBlobUrl);
        return;
      }

      const resolved = await resolveEpisodeVideo(episode);
      if (resolved.streamUrl) {
        setActiveStreamUrl(resolved.streamUrl);
      }
    } catch (err: any) {
      alert(`Playback Error: ${err.message || 'Could not load video preview'}`);
      setIsPlayerOpen(false);
    }
  };

  // Play Offline Video from Vault
  const handlePlayOfflineVideo = (video: SavedOfflineVideo) => {
    const blobUrl = URL.createObjectURL(video.blob);
    setActiveStreamUrl(blobUrl);

    // Create EpisodeItem mock for the player modal
    const mockEp: EpisodeItem = {
      id: video.videoId,
      desc: video.title,
      episodeNumber: video.episodeNumber || 1,
      duration: video.duration,
      coverUrl: video.coverUrl,
      authorUniqueId: video.author,
      authorNickname: video.author,
    };

    setActivePlayerEpisode(mockEp);
    setIsVaultOpen(false);
    setIsPlayerOpen(true);
  };

  // Batch Download Flow
  const handleStartBatchDownload = (itemsToDownload: EpisodeItem[]) => {
    const queueList: BatchItemStatus[] = itemsToDownload.map((ep) => ({
      episode: ep,
      status: 'pending',
    }));

    setBatchQueue(queueList);
    setBatchCurrentIndex(0);
    setBatchModalOpen(true);
    setIsBatchProcessing(true);
    batchCancelRef.current = false;

    processBatchQueue(queueList);
  };

  const processBatchQueue = async (queueList: BatchItemStatus[]) => {
    for (let i = 0; i < queueList.length; i++) {
      if (batchCancelRef.current) break;

      setBatchCurrentIndex(i);
      setBatchQueue((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'resolving', itemProgress: 15 } : item
        )
      );

      const target = queueList[i].episode;

      try {
        const resolved = await resolveEpisodeVideo(target);
        const streamUrl = resolved.streamUrl || resolved.downloadUrl;
        if (!streamUrl) throw new Error('No stream URL available');

        setBatchQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'downloading', itemProgress: 25 } : item
          )
        );

        const blob = await streamDownloadVideoWithProgress(
          streamUrl,
          (percent, loaded, total) => {
            setBatchQueue((prev) =>
              prev.map((item, idx) =>
                idx === i
                  ? {
                      ...item,
                      itemProgress: Math.min(percent, 99),
                      loadedBytes: loaded,
                      totalBytes: total,
                    }
                  : item
              )
            );
          }
        );

        // Save blob to disk directly (no navigation, no 403 error)
        downloadBlobToDisk(blob, resolved.filename);

        // Also save to IndexedDB
        const savedItem: SavedOfflineVideo = {
          id: `ep_${target.id}`,
          videoId: target.id,
          dramaId: parsedData?.dramaInfo?.dramaID,
          dramaTitle: parsedData?.dramaInfo?.dramaName,
          episodeNumber: target.episodeNumber,
          title: target.desc || `Episode ${target.episodeNumber}`,
          author: target.authorUniqueId,
          coverUrl: target.coverUrl,
          blob,
          sizeBytes: blob.size,
          duration: target.duration,
          savedAt: Date.now(),
        };
        await saveVideoToLocalStorage(savedItem);
        await refreshSavedStorage();

        setBatchQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'completed', itemProgress: 100 } : item
          )
        );

        // Pause to prevent browser throttling
        await new Promise((r) => setTimeout(r, 800));
      } catch (err: any) {
        setBatchQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', errorMessage: err.message } : item
          )
        );
      }
    }

    setIsBatchProcessing(false);
  };

  const handleCancelBatch = () => {
    batchCancelRef.current = true;
    setIsBatchProcessing(false);
  };

  const handleClearAllStorage = async () => {
    if (window.confirm('Are you sure you want to remove all saved videos from local storage?')) {
      for (const item of savedVideos) {
        await deleteSavedVideo(item.id);
      }
      await refreshSavedStorage();
    }
  };

  const handleDeleteSavedVideo = async (id: string) => {
    await deleteSavedVideo(id);
    await refreshSavedStorage();
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Bar Contract Compliant Header */}
      <Header
        savedCount={savedVideos.length}
        onOpenVault={() => setIsVaultOpen(true)}
        onNavigateSection={scrollToSection}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">
        {/* Hero Section & Search Bar */}
        <section id="downloader" className="flex flex-col items-center text-center max-w-3xl mx-auto pt-4 sm:pt-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-3 py-1 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Watermark-Free Short Drama Downloader</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight sm:leading-tight">
            Download TikTok Short Drama Episodes in High Quality
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 mt-3 max-w-2xl leading-relaxed">
            Save complete TikTok drama series and individual episodes directly to your local storage without any visible watermarks. Pristine MP4 format with crisp audio.
          </p>

          {/* Search Input Box */}
          <div className="w-full mt-7">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleParseUrl();
              }}
              className="relative flex items-center bg-neutral-900 border border-neutral-800 focus-within:border-rose-500 rounded-2xl p-2 shadow-2xl transition-all"
            >
              <div className="pl-3 pr-2 text-neutral-500">
                <Search className="w-5 h-5" />
              </div>

              <input
                type="text"
                placeholder="Paste TikTok episode link (e.g. https://www.tiktok.com/shortdrama/episode/...)"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-white placeholder-neutral-500 pr-2"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  title="Paste from clipboard"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 rounded-xl transition-colors cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Paste</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Videos</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Example Button (Uses User's provided link) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5 text-xs text-neutral-400">
              <span className="text-neutral-500">Quick Test:</span>
              <button
                type="button"
                onClick={handleLoadExample}
                className="text-xs font-medium text-rose-400 hover:text-rose-300 underline underline-offset-4 cursor-pointer transition-colors"
              >
                Load Example: Ancient Shu Short Drama (Ep. 1)
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full mt-4 p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs sm:text-sm flex items-start gap-3 text-left">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Unable to process link</p>
                <p className="text-neutral-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </section>

        {/* Loaded Drama Hero & Episode Section */}
        {parsedData?.dramaInfo && selectedEpisode && (
          <section className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Series Hero Banner & Overview */}
            <DramaHero
              dramaInfo={parsedData.dramaInfo}
              selectedEpisode={selectedEpisode}
              totalEpisodes={parsedData.episodes?.length || parsedData.dramaInfo.numVideos}
              onPlayEpisode={handlePlayEpisode}
              onDownloadEpisode={handleDownloadEpisode}
              onSaveToLocalStorage={handleSaveToLocalStorage}
              onDownloadAll={() => {
                if (parsedData.episodes && parsedData.episodes.length > 0) {
                  handleStartBatchDownload(parsedData.episodes);
                }
              }}
              isDownloading={downloadingVideoId === selectedEpisode.id}
              isSaving={savingVideoId === selectedEpisode.id}
              isSavedLocally={savedVideoIds.has(selectedEpisode.id)}
            />

            {/* Complete Episode Grid Browser */}
            {parsedData.episodes && parsedData.episodes.length > 0 && (
              <EpisodeGrid
                episodes={parsedData.episodes}
                selectedEpisode={selectedEpisode}
                onSelectEpisode={(ep) => setSelectedEpisode(ep)}
                onPlayEpisode={handlePlayEpisode}
                onDownloadEpisode={handleDownloadEpisode}
                onSaveToLocalStorage={handleSaveToLocalStorage}
                savedVideoIds={savedVideoIds}
                downloadingVideoId={downloadingVideoId}
                savingVideoId={savingVideoId}
                onBatchDownloadSelected={handleStartBatchDownload}
              />
            )}
          </section>
        )}

        {/* Standard Video Result (if user entered single video) */}
        {parsedData?.singleVideo && !parsedData.dramaInfo && (
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-20 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-500">
                <Film className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {parsedData.singleVideo.title}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Creator: @{parsedData.singleVideo.author.uniqueId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const mock: EpisodeItem = {
                    id: parsedData.singleVideo!.id,
                    desc: parsedData.singleVideo!.title,
                    episodeNumber: 1,
                    duration: 0,
                    coverUrl: '',
                    authorUniqueId: parsedData.singleVideo!.author.uniqueId,
                    authorNickname: parsedData.singleVideo!.author.nickname,
                  };
                  handleDownloadEpisode(mock);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Watermark-Free MP4</span>
              </button>
            </div>
          </section>
        )}

        {/* How It Works Explainer */}
        <section id="how-it-works" className="py-8 border-t border-neutral-800/80">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              How TokDrama Works
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Three simple steps to download and store your favorite short drama series.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 flex flex-col gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-400 font-mono font-bold text-sm flex items-center justify-center">
                01
              </div>
              <h3 className="text-sm font-bold text-white">Copy Drama Link</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Open any episode on TikTok, tap Share and Copy Link. Paste it into the search box above.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 flex flex-col gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-400 font-mono font-bold text-sm flex items-center justify-center">
                02
              </div>
              <h3 className="text-sm font-bold text-white">Select Episodes</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                TokDrama loads all episodes in the series. Choose a specific episode or select a batch to queue.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 flex flex-col gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-400 font-mono font-bold text-sm flex items-center justify-center">
                03
              </div>
              <h3 className="text-sm font-bold text-white">Save Locally in MP4</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Download pure MP4 files with zero watermarks directly to your disk or keep them in your offline vault.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <FeaturesSection />

        {/* FAQ Section */}
        <FaqSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 px-6 py-8 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-300">TokDrama</span>
            <span>·</span>
            <span>Watermark-Free TikTok Short Drama & Video Downloader</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>Offline Local Storage Powered</span>
            <span>·</span>
            <span>Original Master MP4 Quality</span>
          </div>
        </div>
      </footer>

      {/* Video Player Modal */}
      {selectedEpisode && (
        <VideoPlayerModal
          episode={activePlayerEpisode || selectedEpisode}
          allEpisodes={parsedData?.episodes || [selectedEpisode]}
          streamUrl={activeStreamUrl}
          isOpen={isPlayerOpen}
          onClose={() => {
            setIsPlayerOpen(false);
            setActiveStreamUrl('');
          }}
          onSelectEpisode={handlePlayEpisode}
          onDownload={handleDownloadEpisode}
          onSaveLocally={handleSaveToLocalStorage}
          isLocallySaved={savedVideoIds.has((activePlayerEpisode || selectedEpisode).id)}
          isDownloading={downloadingVideoId === (activePlayerEpisode || selectedEpisode).id}
          isSaving={savingVideoId === (activePlayerEpisode || selectedEpisode).id}
        />
      )}

      {/* Downloads / Offline Local Storage Vault Drawer */}
      <DownloadsVault
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        savedVideos={savedVideos}
        totalBytes={totalStorageBytes}
        onPlayOfflineVideo={handlePlayOfflineVideo}
        onDeleteVideo={handleDeleteSavedVideo}
        onClearAll={handleClearAllStorage}
      />

      {/* Batch Download Progress Modal */}
      <DownloadProgressModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        queue={batchQueue}
        currentIndex={batchCurrentIndex}
        isProcessing={isBatchProcessing}
        onCancel={handleCancelBatch}
      />

      {/* Single Episode Live Download Progress Bar */}
      <DownloadProgressBar
        downloadState={activeDownload}
        onDismiss={() => setActiveDownload(null)}
      />
    </div>
  );
}
