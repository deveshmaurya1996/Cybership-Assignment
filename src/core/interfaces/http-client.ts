export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpRequestConfig = {
  method?: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  responseType?: "json" | "text";
};

export type HttpResponse<T = unknown> = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
};

export interface HttpClient {
  request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
}
