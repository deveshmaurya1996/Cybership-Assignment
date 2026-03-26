import type { HttpClient } from "./http-client";

export type OperationContext = {
  http: HttpClient;
  getAccessToken: () => Promise<string>;
  baseUrl: string;
  ratingVersion: string;
  transactionSource: string;
  timeoutMs: number;
};

export interface CarrierOperation<TParams, TResult> {
  readonly name: string;
  execute(ctx: OperationContext, params: TParams): Promise<TResult>;
}
