'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import GooglrLogo from '@/components/googlr/GooglrLogo';
import Home from '@/components/googlr/screens/Home';
import Preview from '@/components/googlr/screens/Preview';
import Loading from '@/components/googlr/screens/Loading';
import Results from '@/components/googlr/screens/Results';
import Toast from '@/components/googlr/Toast';
import { searchImage } from '@/lib/googlr/api';
import { makeThumb } from '@/lib/googlr/compress';
import {
  getServerHistorySnapshot,
  getHistorySnapshot,
  saveHistory,
  subscribeHistory,
} from '@/lib/googlr/history';
import type { HistoryEntry, SearchResult } from '@/lib/googlr/types';

type Screen = 'home' | 'preview' | 'loading' | 'results';

export default function Page() {
  const [screen, setScreen] = useState<Screen>('home');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // localStorage is an external store — subscribe without setState-in-effect.
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot
  );

  const previewUrlRef = useRef('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2600);
  }, []);

  // Register the service worker (PWA app shell caching).
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* PWA is progressive — ignore registration failures */
      });
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
  }, []);

  const handleFileSelected = useCallback(
    (f: File) => {
      if (!f.type.startsWith('image/')) {
        showToast('that doesn\u2019t look like an image');
        return;
      }
      clearPreview();
      const url = URL.createObjectURL(f);
      previewUrlRef.current = url;
      setFile(f);
      setPreviewUrl(url);
      setError('');
      setScreen('preview');
    },
    [clearPreview, showToast]
  );

  const handleSearch = useCallback(async () => {
    if (!file) return;
    setScreen('loading');
    setError('');
    try {
      const { result: searchResult, imageDataUrl } = await searchImage(file);
      setResult(searchResult);
      try {
        const thumbnailDataUrl = await makeThumb(imageDataUrl, 100);
        saveHistory({
          id: Date.now(),
          thumbnailDataUrl,
          bestGuess: searchResult.bestGuess,
          result: searchResult,
          timestamp: Date.now(),
        });
      } catch {
        // thumbnail/history is optional — never block results
      }
      setScreen('results');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong';
      setError(message);
      setScreen('preview');
      showToast('search failed — try again');
    }
  }, [file, showToast]);

  const goHome = useCallback(() => {
    clearPreview();
    setFile(null);
    setPreviewUrl('');
    setError('');
    setScreen('home');
  }, [clearPreview]);

  const openHistoryEntry = useCallback((entry: HistoryEntry) => {
    setResult(entry.result);
    setError('');
    setScreen('results');
  }, []);

  return (
    <div className="app-shell">
      <main className="app-main">
        {screen === 'home' && (
          <section className="screen-fade">
            <GooglrLogo />
            <p className="tagline">search by image, find the world</p>
            <Home
              onFileSelected={handleFileSelected}
              history={history}
              onOpenHistory={openHistoryEntry}
            />
          </section>
        )}

        {screen === 'preview' && (
          <Preview
            previewUrl={previewUrl}
            error={error}
            onBack={goHome}
            onChooseDifferent={goHome}
            onSearch={handleSearch}
          />
        )}

        {screen === 'loading' && <Loading />}

        {screen === 'results' && result && (
          <Results result={result} onBack={goHome} onSearchAgain={goHome} onToast={showToast} />
        )}
      </main>

      <footer className="googlr-footer" role="contentinfo">
        <span>a ghost of Google &mdash; built from its bones</span>
        <span className="sub">no accounts &middot; no storage &middot; history stays in your browser</span>
      </footer>

      <Toast message={toast} />
    </div>
  );
}
