export interface AudiusHoldersCsv {
  HolderAddress: string;
  Balance: string;
  PendingBalanceUpdate: string;
}
export interface WhitelistsCsv {
  _id: string;
  email: string;
  magicWalletAddress: string;
}

export interface ExtractDataFromCsvParams {
  filePath: string;
  fileName: string;
}

export interface GetAmountParams {
  amount: string;
}