export interface DramaTheme {
  tagID: string;
  tagKey: string;
  tagVal: string;
}

export interface DramaAuthor {
  user: {
    id: string;
    nickname: string;
    uniqueId: string;
    avatarLarger: string;
    avatarThumb?: string;
    signature?: string;
  };
  stats?: {
    followerCount?: number;
    heartCount?: number;
    videoCount?: number;
  };
}

export interface DramaInfo {
  dramaID: string;
  dramaName: string;
  description: string;
  numVideos: number;
  numWatched: string;
  totalDuration: string;
  cover: {
    urlList: string[];
  };
  zoomCover?: Record<string, string>;
  author: DramaAuthor;
  authorUID: string;
  isLimitedFree?: boolean;
  themes?: DramaTheme[];
}

export interface EpisodeItem {
  id: string; // The specific video ID
  desc: string;
  episodeNumber: number;
  duration: number; // in seconds
  coverUrl: string;
  dynamicCoverUrl?: string;
  authorUniqueId: string;
  authorNickname: string;
  isPreview?: boolean;
  isFree?: boolean;
}

export interface SingleVideoInfo {
  id: string;
  title: string;
  cover: string;
  duration: number;
  author: {
    uniqueId: string;
    nickname: string;
    avatar?: string;
  };
}

export interface ParsedTikTokResponse {
  success: boolean;
  type: 'drama' | 'video';
  dramaInfo?: DramaInfo;
  episodes?: EpisodeItem[];
  targetEpisodeNumber?: number;
  singleVideo?: SingleVideoInfo;
  originalUrl: string;
  error?: string;
}

export interface ResolvedVideoResponse {
  success: boolean;
  videoId: string;
  episodeNumber?: number;
  title: string;
  dramaTitle?: string;
  author: string;
  downloadUrl?: string;
  streamUrl?: string;
  coverUrl?: string;
  duration?: number;
  filename: string;
  source?: string;
  error?: string;
}

export interface SavedOfflineVideo {
  id: string;
  videoId: string;
  dramaId?: string;
  dramaTitle?: string;
  episodeNumber?: number;
  title: string;
  author: string;
  coverUrl: string;
  blob: Blob;
  sizeBytes: number;
  duration: number;
  savedAt: number;
}
