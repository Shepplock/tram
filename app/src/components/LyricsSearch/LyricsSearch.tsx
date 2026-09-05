import { useState } from 'react';
import { flattenLyrics } from '../../engine/glyph';
import { useActiveTone } from '../../hooks/useActiveTone';
import { useLyricsSearchStore } from '../../state/lyricsSearchStore';
import type { LrcLibTrack } from '../../services/lrclib';
import styles from './LyricsSearch.module.scss';

export function LyricsSearch() {
  const open = useLyricsSearchStore((s) => s.open);
  const query = useLyricsSearchStore((s) => s.query);
  const results = useLyricsSearchStore((s) => s.results);
  const status = useLyricsSearchStore((s) => s.status);
  const preview = useLyricsSearchStore((s) => s.preview);
  const returnAlgo = useLyricsSearchStore((s) => s.returnAlgo);
  const setQuery = useLyricsSearchStore((s) => s.setQuery);
  const setPreview = useLyricsSearchStore((s) => s.setPreview);
  const close = useLyricsSearchStore((s) => s.close);
  const { setActive } = useActiveTone();
  const [selected, setSelected] = useState<LrcLibTrack | null>(null);

  if (!open) return null;

  const dismiss = () => {
    if (returnAlgo) setActive({ algo: returnAlgo });
    close();
  };

  const pick = (track: LrcLibTrack) => {
    if (!track.plainLyrics) return;
    setActive({
      algo: 'lyrics',
      lyrics: { text: flattenLyrics(track.plainLyrics), track: track.trackName, artist: track.artistName },
    });
    close();
  };

  const shown = selected ?? preview;

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <input
          type="text"
          autoFocus
          className={styles.input}
          placeholder="Search a song…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
        />

        <div className={styles.body}>
          <ul className={styles.results}>
            {status === 'loading' && <li className={styles.hint}>Searching…</li>}
            {status === 'error' && <li className={styles.hint}>Search failed — try again.</li>}
            {status === 'idle' && query.trim() && !results.length && <li className={styles.hint}>No matches.</li>}
            {results.map((r) => {
              const disabled = !r.plainLyrics || r.instrumental;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    className={styles.result}
                    onMouseEnter={() => setPreview(r)}
                    onClick={() => setSelected(r)}
                  >
                    <span className={styles.track}>{r.trackName}</span>
                    <span className={styles.artist}>{r.artistName} — {r.albumName}</span>
                    {disabled && <span className={styles.noLyrics}>No lyrics</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {shown && (
            <div className={styles.preview}>
              <div className={styles.previewHead}>
                <div className={styles.track}>{shown.trackName}</div>
                <div className={styles.artist}>{shown.artistName}</div>
              </div>
              <pre className={styles.lyrics}>{shown.plainLyrics || 'No lyrics available.'}</pre>
              {selected && !!selected.plainLyrics && (
                <button type="button" className={styles.use} onClick={() => pick(selected)}>Use these lyrics</button>
              )}
            </div>
          )}
        </div>

        <button type="button" className={styles.close} onClick={dismiss}>Cancel</button>
      </div>
    </div>
  );
}
