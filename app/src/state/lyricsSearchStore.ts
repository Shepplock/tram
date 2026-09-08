import { create } from 'zustand';
import type { Algo } from '../engine/types';
import { searchLyrics, type LrcLibTrack } from '../services/lrclib';

interface LyricsSearchStore {
  open: boolean;
  query: string;
  results: LrcLibTrack[];
  status: 'idle' | 'loading' | 'error';
  preview: LrcLibTrack | null;
  /** Algo to restore if the overlay is dismissed without picking a song. */
  returnAlgo: Algo | null;
  openSearch: (returnAlgo: Algo) => void;
  close: () => void;
  setQuery: (q: string) => void;
  setPreview: (track: LrcLibTrack | null) => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;

export const useLyricsSearchStore = create<LyricsSearchStore>((set) => ({
  open: false,
  query: '',
  results: [],
  status: 'idle',
  preview: null,
  returnAlgo: null,
  openSearch: (returnAlgo) => set({ open: true, returnAlgo, query: '', results: [], preview: null, status: 'idle' }),
  close: () => {
    clearTimeout(timer);
    set({ open: false, returnAlgo: null });
  },
  setPreview: (track) => set({ preview: track }),
  setQuery: (q) => {
    set({ query: q });
    clearTimeout(timer);
    if (!q.trim()) { set({ results: [], status: 'idle' }); return; }
    const mySeq = ++seq;
    timer = setTimeout(() => {
      set({ status: 'loading' });
      searchLyrics(q)
        .then((results) => { if (mySeq === seq) set({ results, status: 'idle' }); })
        .catch(() => { if (mySeq === seq) set({ results: [], status: 'error' }); });
    }, 400);
  },
}));
