export const fixedDecimals = (value: number | string): number => {
  const s = value.toString();
  if (!s || isNaN(parseFloat(s))) {
    return 0;
  }
  const [integerPart, decimals] = s.split('.');
  const n = parseFloat(s);

  if (decimals?.length > 6) {
    return parseFloat(n.toPrecision(Math.min(integerPart.length + 3, 21)));
  }

  return n;
};
