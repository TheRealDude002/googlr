export interface SourceItem {
  url: string;
}

export interface EntityItem {
  name: string;
  /** confidence 0–1, or null when the backend cannot provide one (Lens scraper) */
  score: number | null;
}

export interface SearchResult {
  bestGuess: string;
  safeSearch: 'safe' | 'flagged';
  sources: SourceItem[];
  partialMatches: SourceItem[];
  similarImages: SourceItem[];
  entities: EntityItem[];
  /** true when the API route returned canned demo data (no API key configured) */
  demo?: boolean;
}

export interface HistoryEntry {
  id: number;
  thumbnailDataUrl: string;
  bestGuess: string;
  result: SearchResult;
  timestamp: number;
}
