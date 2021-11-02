export interface MuxServerData {
  total_row_count: number;
  data: {
    field: string;
    views: number;
  }[];
}

export interface MuxDataInputValue {
  totalCount: number;
  values: {
    trackId: string;
    amount: number;
  }[];
}
