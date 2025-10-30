export const roundCurrency = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const ensureNonNegative = (value: number): number => {
  return value < 0 ? 0 : value;
};
