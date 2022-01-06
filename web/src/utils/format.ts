export const currency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export const fixedDecimals = (value: number | string) => {
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
