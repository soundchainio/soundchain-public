export const compareWallets = (wallet1: string | undefined | null, wallet2: string | undefined | null) =>
  wallet1?.toLowerCase() === wallet2?.toLowerCase();
