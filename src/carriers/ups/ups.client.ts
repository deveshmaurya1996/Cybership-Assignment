import { randomBytes } from "crypto";
import type { HttpClient } from "../../core/interfaces/http-client";
import { CarrierError } from "../../core/errors/carrier-error";
import { UpsOAuthClient } from "./ups.auth";
import { buildRatingUrl, type RatingPathRequestOption } from "./ups-api-spec";
import { upsHttpError } from "./ups.errors";
import { upsRateResponseSchema, type UpsRateRequestWrapper, type UpsRateResponse } from "./ups.types";

export type UpsRatingClientConfig = {
  apiBaseUrl: string;
  ratingVersion: string;
  transactionSource: string;
  timeoutMs: number;
};

export class UpsRatingClient {
  constructor(
    private readonly http: HttpClient,
    private readonly oauth: UpsOAuthClient,
    private readonly cfg: UpsRatingClientConfig
  ) {}

  async rate(
    body: UpsRateRequestWrapper,
    requestoption: RatingPathRequestOption
  ): Promise<UpsRateResponse> {
    const transId = randomBytes(16).toString("hex");
    const url = buildRatingUrl(this.cfg.apiBaseUrl, this.cfg.ratingVersion, requestoption);

    const run = async (bearer: string) =>
      this.http.request<unknown>({
        method: "POST",
        url,
        headers: {
          Authorization: `Bearer ${bearer}`,
          transId,
          transactionSrc: this.cfg.transactionSource,
          "Content-Type": "application/json",
        },
        data: body,
        timeoutMs: this.cfg.timeoutMs,
      });

    let bearer = await this.oauth.getAccessToken();
    let res = await run(bearer);
    if (res.status === 401) {
      await this.oauth.invalidate();
      bearer = await this.oauth.getAccessToken();
      res = await run(bearer);
    }

    if (res.status === 200) {
      let raw: unknown = res.data;
      if (typeof raw === "string") {
        try {
          raw = JSON.parse(raw);
        } catch (e) {
          throw new CarrierError("PARSE_ERROR", "UPS Rating response was not valid JSON", {
            carrierId: "ups",
            cause: e,
          });
        }
      }
      const parsed = upsRateResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new CarrierError("PARSE_ERROR", "UPS Rating response failed validation", {
          carrierId: "ups",
          cause: parsed.error,
        });
      }
      return parsed.data;
    }

    throw upsHttpError(res.status, res.data, "ups");
  }
}
