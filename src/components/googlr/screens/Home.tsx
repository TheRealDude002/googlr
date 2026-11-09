'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import SkeuButton from '../SkeuButton';
import type { HistoryEntry } from '@/lib/googlr/types';

interface HomeProps {
  onFileSelected: (file: File) => void;
  history: HistoryEntry[];
  onOpenHistory: (entry: HistoryEntry) => void;
}

export default function Home({ onFileSelected, history, onOpenHistory }: HomeProps) {
  const [dragOver, setDragOver] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  // Clipboard paste — Ctrl+V on desktop, paste menu on mobile.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onFileSelected(file);
            return;
          }
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [onFileSelected]);

  const openUpload = () => uploadInputRef.current?.click();
  const openCamera = () => cameraInputRef.current?.click();

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openUpload();
    }
  };

  return (
    <div className="mt-7">
      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload an image: drag and drop, tap to browse, or paste from clipboard"
        className={`dropzone ${dragOver ? 'drag-over' : ''}`}
        onClick={openUpload}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="neu-circle" aria-hidden="true">
          <ImagePlus size={26} strokeWidth={1.8} />
        </div>
        <p className="dz-title">drop an image here</p>
        <p className="dz-sub">or tap to browse &middot; paste from clipboard (Ctrl+V)</p>
      </div>

      {/* Hidden file inputs, triggered programmatically */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Action buttons */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SkeuButton variant="secondary" onClick={openUpload}>
          <span className="emoji" aria-hidden="true">📁</span> Upload
        </SkeuButton>
        <SkeuButton variant="secondary" onClick={openCamera}>
          <span className="emoji" aria-hidden="true">📷</span> Camera
        </SkeuButton>
      </div>

      {/* Recent searches */}
      <section aria-label="Recent searches">
        <h3 className="section-title">Recent Searches</h3>
        {history.length > 0 ? (
          <div className="history-grid">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="history-item"
                onClick={() => onOpenHistory(entry)}
                title={`${entry.bestGuess} · ${new Date(entry.timestamp).toLocaleString()}`}
                aria-label={`Show cached results for: ${entry.bestGuess}`}
              >
                <img
                  src={entry.thumbnailDataUrl}
                  alt={entry.bestGuess}
                  className="history-thumb"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="history-empty">no pins yet &mdash; your last 10 searches will collect here</p>
        )}
      </section>
    </div>
  );
}
