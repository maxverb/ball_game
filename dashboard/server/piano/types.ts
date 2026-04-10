// Piano Analytics Data Query API request/response shapes.
// https://api.atinternet.io/v3/data/getData

export interface PianoPeriodDay {
  type: 'D';
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
}

export interface PianoSpace {
  s: number[]; // site IDs
}

export interface PianoSort {
  [column: string]: 'asc' | 'desc';
}

export interface PianoRequest {
  spaces: PianoSpace[];
  columns: string[];
  period: { p1: PianoPeriodDay[] };
  sort?: string[];
  'max-results'?: number;
  'page-num'?: number;
  evo?: boolean;
  filter?: Record<string, unknown>;
}

// Piano responses come back with Rows as arrays of objects keyed by column name.
export interface PianoRowRaw {
  [column: string]: string | number | null;
}

export interface PianoResponse {
  DataFeed: {
    Rows: PianoRowRaw[];
    RowCounts?: { total?: number };
  }[];
}
