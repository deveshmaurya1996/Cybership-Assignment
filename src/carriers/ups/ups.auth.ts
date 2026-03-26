import type { HttpClient } from "../../core/interfaces/http-client";
import type { StringCache } from "../../core/interfaces/cache";
import { CarrierError } from "../../core/errors/carrier-error";
import { upsOAuthTokenResponseSchema } from "./ups.types";

const CACHE_KEY = "ups:oauth:access_token";

export type UpsOAuthConfig = {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  timeoutMs: number;
  tokenSkewSeconds: number;
};

export class UpsOAuthClient {
  private inflight: Promise<string> | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly cache: StringCache,
    private readonly cfg: UpsOAuthConfig
  ) {}

  async getAccessToken(): Promise<string> {
    const existing = await this.cache.get(CACHE_KEY);
    if (existing) return existing;
    if (this.inflight) return this.inflight;
    this.inflight = this.fetchAndCacheToken();
    try {
      return await this.inflight;
    } finally {
      this.inflight = null;
    }
  }

  async invalidate(): Promise<void> {
    await this.cache.delete(CACHE_KEY);
  }

  private async fetchAndCacheToken(): Promise<string> {
    const basic = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`, "utf8").toString(
      "base64"
    );
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    const res = await this.http.request<unknown>({
      method: "POST",
      url: this.cfg.tokenUrl,
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: body.toString(),
      timeoutMs: this.cfg.timeoutMs,
    });

    if (res.status === 401 || res.status === 403) {
      throw new CarrierError("UNAUTHORIZED", "UPS OAuth rejected client credentials", {
        httpStatus: res.status,
        details: { upsErrors: [{ message: String(res.data) }] },
      });
    }

    if (res.status === 429) {
      throw new CarrierError("RATE_LIMITED", "UPS OAuth rate limit exceeded", {
        httpStatus: 429,
      });
    }

    if (res.status >= 500) {
      throw new CarrierError("HTTP_ERROR", "UPS OAuth server error", { httpStatus: res.status });
    }

    if (res.status < 200 || res.status >= 300) {
      throw new CarrierError("HTTP_ERROR", `UPS OAuth unexpected status ${res.status}`, {
        httpStatus: res.status,
      });
    }

    let raw: unknown = res.data;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        throw new CarrierError("PARSE_ERROR", "UPS OAuth response was not valid JSON", {
          cause: e,
        });
      }
    }

    const parsed = upsOAuthTokenResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CarrierError("PARSE_ERROR", "UPS OAuth token response failed validation", {
        cause: parsed.error,
      });
    }

    const token = parsed.data.access_token;
    const expiresRaw = parsed.data.expires_in;
    const expiresSec =
      typeof expiresRaw === "number"
        ? expiresRaw
        : typeof expiresRaw === "string"
          ? Number(expiresRaw)
          : 3600;
    const ttl = Math.max(30, (Number.isFinite(expiresSec) ? expiresSec : 3600) - this.cfg.tokenSkewSeconds);

    await this.cache.set(CACHE_KEY, token, ttl);
    return token;
  }
}
