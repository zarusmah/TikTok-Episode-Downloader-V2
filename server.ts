import express, { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Force IPv4-first resolution to prevent IPv6 timeout stalls in Cloud Run containers
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory cache for resolved video URLs to prevent repeated upstream calls
const resolvedUrlCache = new Map<string, { downloadUrl: string; expiresAt: number; source: string }>();

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// Helper to expand shortened links (e.g. vt.tiktok.com, vm.tiktok.com)
async function expandUrl(inputUrl: string): Promise<string> {
  const trimmed = inputUrl.trim();
  // If already a standard or shortdrama tiktok link, don't follow redirect (which redirects to /foryou)
  if (trimmed.includes('/shortdrama/') || trimmed.includes('/video/') || trimmed.includes('/@')) {
    return trimmed;
  }

  // Only expand shortened domains
  if (/vt\.tiktok\.com|vm\.tiktok\.com|t\.co|bit\.ly/i.test(trimmed)) {
    try {
      const res = await fetch(trimmed, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': DEFAULT_USER_AGENT },
      });
      const location = res.headers.get('location');
      if (location) {
        return location.startsWith('http') ? location : new URL(location, trimmed).toString();
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

// Extract drama or video parameters from URL
function parseTikTokUrl(rawUrl: string): {
  isDrama: boolean;
  dramaId?: string;
  episodeNum?: number;
  videoId?: string;
  author?: string;
} {
  const url = rawUrl.trim();

  // Pattern 1: Short drama episode URL: /shortdrama/episode/:slug/:ep or /shortdrama/episode/:lang/:slug/:ep
  const dramaMatch = url.match(/\/shortdrama\/episode\/(?:[a-zA-Z_-]+\/)?(\d+)(?:\/(\d+))?/i);
  if (dramaMatch) {
    return {
      isDrama: true,
      dramaId: dramaMatch[1],
      episodeNum: dramaMatch[2] ? parseInt(dramaMatch[2], 10) : 1,
    };
  }

  // Pattern 2: Short drama general / share: /node/share/shortdrama/:id or /shortdrama/:id
  const dramaShareMatch = url.match(/(?:\/node\/share\/shortdrama\/|\/shortdrama\/(?:[a-zA-Z_-]+\/)?)(\d+)/i);
  if (dramaShareMatch && !url.includes('/video/')) {
    return {
      isDrama: true,
      dramaId: dramaShareMatch[1],
      episodeNum: 1,
    };
  }

  // Pattern 3: Standard TikTok video: /@author/video/:videoId or /video/:videoId
  const videoMatch = url.match(/(?:@([a-zA-Z0-9_.-]+)\/video\/|(?:\/|v=))(\d{15,22})/i);
  if (videoMatch) {
    return {
      isDrama: false,
      author: videoMatch[1] || 'tiktok',
      videoId: videoMatch[2],
    };
  }

  // Pattern 4: Bare ID (e.g. user just pasted the drama or video ID)
  const bareIdMatch = url.match(/^(\d{18,21})$/);
  if (bareIdMatch) {
    return {
      isDrama: true,
      dramaId: bareIdMatch[1],
      episodeNum: 1,
    };
  }

  return { isDrama: false };
}

// Resolve video download URL without watermark
async function resolveTikTokVideo(videoId: string, authorUniqueId: string = 'tiktok'): Promise<{
  success: boolean;
  downloadUrl?: string;
  source?: string;
  error?: string;
}> {
  // Check memory cache first
  const cached = resolvedUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      success: true,
      downloadUrl: cached.downloadUrl,
      source: cached.source,
    };
  }

  const cleanAuthor = authorUniqueId || 'tiktok';
  const videoUrl = `https://www.tiktok.com/@${cleanAuthor}/video/${videoId}`;

  // Method 1: SSSTik.io resolver (with retry and timeout)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const pageRes = await fetch('https://ssstik.io/en', {
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      const pageHtml = await pageRes.text();
      const ttMatch = pageHtml.match(/name="tt"\s+value="([^"]+)"/);
      const tt = ttMatch ? ttMatch[1] : '';
      const cookie = pageRes.headers.get('set-cookie') || '';

      const postRes = await fetch('https://ssstik.io/abc?url=dl', {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': DEFAULT_USER_AGENT,
          Cookie: cookie,
          'HX-Request': 'true',
          'HX-Target': 'target',
          'HX-Current-URL': 'https://ssstik.io/en',
        },
        body: new URLSearchParams({ id: videoUrl, locale: 'en', tt }),
      });

      const postHtml = await postRes.text();
      const downloadMatches = [
        ...postHtml.matchAll(/href="(https:\/\/[^"]*tikcdn\.io\/ssstik\/[^"]+)"/g),
      ].map((m) => m[1]);

      if (downloadMatches.length > 0) {
        resolvedUrlCache.set(videoId, {
          downloadUrl: downloadMatches[0],
          expiresAt: Date.now() + 30 * 60 * 1000,
          source: 'ssstik',
        });
        return {
          success: true,
          downloadUrl: downloadMatches[0],
          source: 'ssstik',
        };
      }
    } catch (err: any) {
      console.warn(`SSSTik attempt ${attempt} error:`, err.message);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 600));
    }
  }

  // Method 2: TikWM fallback
  try {
    const tikwmRes = await fetch(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}&hd=1`,
      {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': DEFAULT_USER_AGENT },
      }
    );
    const data = await tikwmRes.json();
    if (data.code === 0 && data.data) {
      const url = data.data.hdplay || data.data.play || data.data.wmplay;
      if (url) {
        resolvedUrlCache.set(videoId, {
          downloadUrl: url,
          expiresAt: Date.now() + 30 * 60 * 1000,
          source: 'tikwm',
        });
        return {
          success: true,
          downloadUrl: url,
          source: 'tikwm',
        };
      }
    }
  } catch (err: any) {
    console.warn('TikWM resolver warning:', err.message);
  }

  return {
    success: false,
    error: 'Failed to extract watermark-free video download link',
  };
}

// 1. API Endpoint: Parse drama or video URL
app.post('/api/drama/parse', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const expanded = await expandUrl(url);
    const parsed = parseTikTokUrl(expanded);

    if (parsed.isDrama && parsed.dramaId) {
      // 1. Fetch drama detail
      const detailParams = new URLSearchParams({
        dramaID: parsed.dramaId,
        aid: '1988',
      });
      const detailRes = await fetch(
        `https://www.tiktok.com/api/drama/detail/?${detailParams.toString()}`,
        {
          headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            Referer: 'https://www.tiktok.com/',
          },
        }
      );
      const detailJson = await detailRes.json();

      if (!detailJson || !detailJson.dramaInfo) {
        return res.status(404).json({
          success: false,
          error: 'Drama series not found on TikTok. Please verify the link or ID.',
        });
      }

      const dramaInfo = detailJson.dramaInfo;

      // 2. Fetch all episodes
      const count = Math.min(Math.max(dramaInfo.numVideos || 30, 10), 100);
      const epParams = new URLSearchParams({
        dramaID: parsed.dramaId,
        cursor: '0',
        count: count.toString(),
        aid: '1988',
      });

      const epRes = await fetch(
        `https://www.tiktok.com/api/drama/episode/item_list/?${epParams.toString()}`,
        {
          headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            Referer: 'https://www.tiktok.com/',
          },
        }
      );
      const epJson = await epRes.json();
      const rawItemList = epJson.itemList || [];

      const episodes = rawItemList.map((it: any, index: number) => {
        const epNum = it.dramaInfo?.DramaVideoData?.EpisodeNumber || index + 1;
        const cover =
          it.video?.cover ||
          it.video?.originCover ||
          it.video?.zoomCover?.['720'] ||
          dramaInfo.cover?.urlList?.[0] ||
          '';

        return {
          id: it.id,
          desc: it.desc || `Episode ${epNum}`,
          episodeNumber: epNum,
          duration: it.video?.duration || 0,
          coverUrl: cover,
          dynamicCoverUrl: it.video?.dynamicCover || '',
          authorUniqueId: it.author?.uniqueId || dramaInfo.author?.user?.uniqueId || 'tiktok',
          authorNickname: it.author?.nickname || dramaInfo.author?.user?.nickname || 'Creator',
          isPreview: Boolean(it.dramaInfo?.DramaVideoData?.IsPreview),
          isFree: Boolean(it.dramaInfo?.DramaVideoData?.IsFreeIntro || it.dramaInfo?.isLimitedFree),
        };
      });

      // Sort episodes ascending by episodeNumber
      episodes.sort((a: any, b: any) => a.episodeNumber - b.episodeNumber);

      return res.json({
        success: true,
        type: 'drama',
        dramaInfo,
        episodes,
        targetEpisodeNumber: parsed.episodeNum || 1,
        originalUrl: url,
      });
    }

    if (parsed.videoId) {
      // Standard video parsing
      const resolved = await resolveTikTokVideo(parsed.videoId, parsed.author);

      return res.json({
        success: true,
        type: 'video',
        singleVideo: {
          id: parsed.videoId,
          title: `TikTok Video ${parsed.videoId}`,
          cover: '',
          duration: 0,
          author: {
            uniqueId: parsed.author || 'creator',
            nickname: parsed.author || 'Creator',
          },
        },
        resolved,
        originalUrl: url,
      });
    }

    return res.status(400).json({
      success: false,
      error:
        'Could not parse TikTok link. Please paste a valid TikTok Short Drama episode link or standard video URL.',
    });
  } catch (error: any) {
    console.error('Error in /api/drama/parse:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while parsing TikTok link',
    });
  }
});

// 2. API Endpoint: Resolve single episode or video to watermark-free MP4
app.post('/api/video/resolve', async (req: Request, res: Response) => {
  try {
    const { videoId, authorUniqueId, dramaTitle, episodeNumber, title } = req.body;
    if (!videoId) {
      return res.status(400).json({ success: false, error: 'videoId is required' });
    }

    const resolved = await resolveTikTokVideo(videoId, authorUniqueId);
    if (!resolved.success || !resolved.downloadUrl) {
      return res.status(200).json({
        success: false,
        error: resolved.error || 'Failed to extract watermark-free video',
      });
    }

    // Build clean filename
    const cleanDrama = (dramaTitle || 'TikTok')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 40);
    const epStr = episodeNumber ? `_Ep${String(episodeNumber).padStart(2, '0')}` : '';
    const cleanAuthor = (authorUniqueId || 'creator').replace(/[^a-zA-Z0-9-_]/g, '');
    const filename = `${cleanDrama}${epStr}_${cleanAuthor}_no_watermark.mp4`;

    const streamUrl = `/api/video/download?url=${encodeURIComponent(
      resolved.downloadUrl
    )}&filename=${encodeURIComponent(filename)}&inline=1`;
    const directDownloadUrl = `/api/video/download?url=${encodeURIComponent(
      resolved.downloadUrl
    )}&filename=${encodeURIComponent(filename)}`;

    return res.json({
      success: true,
      videoId,
      episodeNumber,
      title: title || `Episode ${episodeNumber || 1}`,
      dramaTitle,
      author: authorUniqueId,
      downloadUrl: directDownloadUrl,
      streamUrl,
      rawCdnUrl: resolved.downloadUrl,
      filename,
      source: resolved.source,
    });
  } catch (error: any) {
    console.error('Error in /api/video/resolve:', error);
    return res.status(200).json({
      success: false,
      error: error.message || 'Internal server error resolving video',
    });
  }
});

// 3. API Endpoint: Stream / Proxy download video file directly to user
// Proxies with IPv4 (family: 4) to prevent container IPv6 connect timeouts,
// and supports HTTP 206 Range requests for seamless video scrub/preview.
app.get('/api/video/download', (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  const filename = (req.query.filename as string) || 'tiktok_video_no_watermark.mp4';
  const isInline = req.query.inline === '1';

  if (!targetUrl) {
    return res.status(400).send('Video URL parameter is required');
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestHeaders: Record<string, string | string[] | undefined> = {
      'User-Agent': DEFAULT_USER_AGENT,
      Referer: 'https://ssstik.io/',
      Accept: '*/*',
    };

    if (req.headers.range) {
      requestHeaders.range = req.headers.range;
    }

    const proxyReq = client.get(
      targetUrl,
      {
        family: 4, // Force IPv4
        headers: requestHeaders,
      },
      (proxyRes) => {
        const statusCode = proxyRes.statusCode || 200;

        if (statusCode >= 300 && statusCode < 400 && proxyRes.headers.location) {
          // Handle redirect
          const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString();
          return res.redirect(
            `/api/video/download?url=${encodeURIComponent(redirectUrl)}&filename=${encodeURIComponent(
              filename
            )}${isInline ? '&inline=1' : ''}`
          );
        }

        const disposition = isInline
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`;

        res.writeHead(statusCode, {
          'Content-Type': 'video/mp4',
          'Content-Disposition': disposition,
          'Content-Length': proxyRes.headers['content-length'] || '',
          'Content-Range': proxyRes.headers['content-range'] || '',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Disposition, Accept-Ranges',
        });

        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error('Proxy download stream error:', err.message);
      if (!res.headersSent) {
        res.status(502).send('Error streaming video from remote CDN');
      }
    });

    req.on('close', () => {
      proxyReq.destroy();
    });
  } catch (err: any) {
    console.error('Invalid URL error:', err.message);
    if (!res.headersSent) {
      res.status(400).send('Invalid video target URL');
    }
  }
});

// Setup Vite in Dev or static assets in Prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`TokDrama server running on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
