export type ApiFieldErrors = Record<string, string[]>;

export interface ApiErrorShape {
  message: string;
  code: string;
  status: number;
  fieldErrors?: ApiFieldErrors;
  details?: unknown;
}

export interface RequestMetadata {
  requestId: string;
  startedAt: number;
  source: string;
}
