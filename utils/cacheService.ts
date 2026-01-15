
export const CacheService = {
  set: (key: string, data: any, ttlHours: number = 1) => {
    const entry = {
      data,
      expiry: Date.now() + ttlHours * 60 * 60 * 1000,
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  },

  get: (key: string) => {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) return null;

    const entry = JSON.parse(cached);
    if (Date.now() > entry.expiry) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    return entry.data;
  },

  clear: (key: string) => {
    localStorage.removeItem(`cache_${key}`);
  }
};
