import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { CarrierError } from "../../core/errors/carrier-error";
import type { HttpClient, HttpRequestConfig, HttpResponse } from "../../core/interfaces/http-client";

function normalizeHeaders(h: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    out[k] = String(v);
  }
  return out;
}

export class AxiosHttpClient implements HttpClient {
  constructor(private readonly defaultTimeoutMs: number) {}

  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const axiosConfig: AxiosRequestConfig = {
      method: config.method ?? "GET",
      url: config.url,
      headers: config.headers,
      data: config.data,
      params: config.params,
      timeout: config.timeoutMs ?? this.defaultTimeoutMs,
      responseType: config.responseType ?? "json",
      validateStatus: () => true,
    };

    try {
      const res = await axios.request<T>(axiosConfig);
      return {
        status: res.status,
        statusText: res.statusText,
        headers: normalizeHeaders(res.headers as Record<string, unknown>),
        data: res.data,
      };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw mapAxiosError(err);
      }
      throw err;
    }
  }
}

function mapAxiosError(err: AxiosError): CarrierError {
  const code = err.code;
  if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
    return new CarrierError("TIMEOUT", "HTTP request timed out", { cause: err });
  }
  if (code === "ENOTFOUND" || code === "ECONNRESET" || code === "ECONNREFUSED") {
    return new CarrierError("NETWORK_ERROR", err.message || "Network error", { cause: err });
  }
  return new CarrierError("NETWORK_ERROR", err.message || "HTTP client error", { cause: err });
}
