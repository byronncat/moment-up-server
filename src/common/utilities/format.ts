export const origin = (origin: string) => {
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};
