export const origin = (origin?: string | null) => {
  if (!origin) return '';
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};
