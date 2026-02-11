const explicitBase = import.meta.env.VITE_API_BASE;
export const API_BASE = explicitBase ?? (import.meta.env.DEV ? 'http://localhost:4001' : '');
