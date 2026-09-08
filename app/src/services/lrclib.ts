/** Public, CORS-open, no-auth lyrics API (https://lrclib.net) — this repo's
 *  first network call. */
export interface LrcLibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export async function searchLyrics(query: string): Promise<LrcLibTrack[]> {
  const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`LRCLIB search failed: ${res.status}`);
  return res.json() as Promise<LrcLibTrack[]>;
}
