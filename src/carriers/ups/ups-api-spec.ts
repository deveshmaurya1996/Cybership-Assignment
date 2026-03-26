export const UPS_RATING_OPERATION_DOC =
  "https://developer.ups.com/tag/Rating?loc=en_US#operation/Rate" as const;

export type RatingPathRequestOption = "Rate" | "Shop" | "Ratetimeintransit" | "Shoptimeintransit";

export function buildRatingUrl(
  apiBaseUrl: string,
  version: string,
  requestoption: RatingPathRequestOption
): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/rating/${encodeURIComponent(version)}/${encodeURIComponent(requestoption)}`;
}

export const RATE_SHOP_REQUEST_OPTION: RatingPathRequestOption = "Shop";
