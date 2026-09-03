/** localStorage wrapper with an in-memory fallback, mirroring the original
 *  single-file app's `store` object. */
const mem: Record<string, unknown> = {};
const hasLS = (() => {
  try {
    localStorage.setItem('__t', '1');
    localStorage.removeItem('__t');
    return true;
  } catch {
    return false;
  }
})();

export const storage = {
  get<T>(key: string): T | null {
    if (hasLS) {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    return (mem[key] as T) ?? null;
  },
  set<T>(key: string, value: T): void {
    if (hasLS) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }
    mem[key] = value;
  },
};
