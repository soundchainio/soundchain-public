export interface Account {
  HolderAddress: string;
  Balance: string;
  PendingBalanceUpdate: string;
}

export interface ExtractDataFromCsvParams {
  filePath: string;
  fileName: string;
}

export interface GetAmountParams {
  amount: string;
}