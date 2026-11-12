'use client';

import { useCallback, useState } from 'react';
import { Globe } from 'lucide-react';
import SkeuButton from '../SkeuButton';
import Corkboard, { NoteCard } from '../Corkboard';
import type { SourceItem, SearchResult } from '@/lib/googlr/types';

interface ResultsProps {
  result: SearchResult;
  onBack: () => void;
  onSearchAgain: () => void;
  onToast: (message: string) => void;
}

function prettyUrl(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return raw;
  }
}

function SourceRow({ item }: { item: SourceItem }) {
  return (
    <a className="source-link" href={item.url} target="_blank" rel="noopener noreferrer">
      <span className="globe-fav" aria-hidden="true">
        <Globe size={12} strokeWidth={2} />
      </span>
      <span className="source-url">{prettyUrl(item.url)}</span>
    </a>
  );
}

export default function Results({ result, onBack, onSearchAgain, onToast }: ResultsProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    const text =
      `Googlr best guess: “${result.bestGuess}”` +
      (result.sources[0] ? `\nFound on: ${result.sources[0].url}` : '');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Googlr', text });
        return;
      } catch (err) {
        // user cancelled (AbortError) — do nothing; other errors fall through to clipboard
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      onToast('copied to clipboard');
    } catch {
      onToast('could not share on this device');
    }
  }, [result, onToast]);

  const handleSearchAgain = useCallback(async () => {
    setSharing(false);
    onSearchAgain();
  }, [onSearchAgain]);

  const flagged = result.safeSearch === 'flagged';

  return (
    <div className="screen-fade">
      <nav className="googlr-nav" aria-label="Googlr">
        <span className="wordmark">Googlr</span>
        <SkeuButton variant="secondary" small onClick={onBack} aria-label="Go back">
          ← Back
        </SkeuButton>
      </nav>

      {/* Best Guess banner — always first, always prominent */}
      <header className="bestguess-banner">
        <p className="bestguess-label">Best Guess</p>
        <h1 className="bestguess-text">{result.bestGuess}</h1>
        <span className={`safe-badge ${flagged ? 'flagged' : 'safe'}`}>
          {flagged ? '⚠ flagged' : '✓ safe'} · safe search
        </span>
        {result.demo ? (
          <p className="demo-note">demo mode — add IMGBB_API_KEY + LENS_WORKER_URL for live results</p>
        ) : null}
      </header>

      <div className="mt-5">
        <Corkboard>
          {/* Card 1 — exact + partial matches */}
          <NoteCard tack="red" title="Found on the web" delay={0}>
            {result.sources.length > 0 ? (
              <div className="sources-list skeu-scroll">
                {result.sources.map((item, i) => (
                  <SourceRow key={`src-${i}`} item={item} />
                ))}
              </div>
            ) : (
              <p className="sources-empty">no exact matches found on the web</p>
            )}

            {result.partialMatches.length > 0 ? (
              <>
                <p className="partial-title">partial / edited matches</p>
                <div>
                  {result.partialMatches.map((item, i) => (
                    <SourceRow key={`part-${i}`} item={item} />
                  ))}
                </div>
              </>
            ) : null}
          </NoteCard>

          {/* Card 2 — web entities */}
          <NoteCard tack="teal" title="Identified as" delay={70}>
            {result.entities.length > 0 ? (
              <div className="entity-cloud">
                {result.entities.map((entity, i) => (
                  <span key={i} className="entity-chip">
                    {entity.name}
                    {typeof entity.score === 'number' ? (
                      <span className="entity-score">{Math.round(entity.score * 100)}%</span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : (
              <p className="sources-empty">nothing recognisable — try a clearer image</p>
            )}
          </NoteCard>

          {/* Card 3 — visually similar images */}
          <NoteCard
            tack="gold"
            title={`${result.similarImages.length} visually similar image${result.similarImages.length === 1 ? '' : 's'}`}
            delay={140}
          >
            {result.similarImages.length > 0 ? (
              <div className="similar-strip skeu-scroll" aria-label="Visually similar images">
                {result.similarImages.map((item, i) => (
                  <img
                    key={i}
                    src={item.url}
                    alt={`Visually similar image ${i + 1}`}
                    className="similar-thumb"
                    loading="lazy"
                  />
                ))}
              </div>
            ) : (
              <p className="similar-empty">no similar images pinned — the board is bare</p>
            )}
          </NoteCard>
        </Corkboard>
      </div>

      {/* Action bar */}
      <div className="action-bar">
        <SkeuButton variant="secondary" onClick={handleShare} disabled={sharing}>
          <span aria-hidden="true">↑</span> Share
        </SkeuButton>
        <SkeuButton variant="primary" onClick={handleSearchAgain}>
          Search Again
        </SkeuButton>
      </div>
    </div>
  );
}
