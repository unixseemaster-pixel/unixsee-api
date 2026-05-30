export type ApiResponse<T> = {
  success: boolean;
  statusCode: number;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta?: unknown;
};
