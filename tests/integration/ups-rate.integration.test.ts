import nock from "nock";
import { readFileSync } from "fs";
import { join } from "path";
import { AxiosHttpClient } from "../../src/infrastructure/http/axios.client";
import { MemoryStringCache } from "../../src/infrastructure/cache/memory.cache";
import { createRateService } from "../../src/factories/service.factory";
import { setTestEnv } from "../helpers/test-env";

const fixturesDir = join(__dirname, "../fixtures");
const oauthFixture = JSON.parse(readFileSync(join(fixturesDir, "oauth-token-success.json"), "utf8"));
const rateSuccess = JSON.parse(readFileSync(join(fixturesDir, "ups-rate-success.json"), "utf8"));
const rateError = JSON.parse(readFileSync(join(fixturesDir, "ups-error-400.json"), "utf8"));

const basePayload = {
  origin: {
    lines: ["10 Main St"],
    city: "Baltimore",
    stateProvince: "MD",
    postalCode: "21093",
    countryCode: "US",
  },
  destination: {
    lines: ["1 North Ave"],
    city: "Alpharetta",
    stateProvince: "GA",
    postalCode: "30005",
    countryCode: "US",
  },
  packages: [
    {
      weightLb: 1,
      lengthIn: 5,
      widthIn: 5,
      heightIn: 5,
    },
  ],
};

describe("UPS rating integration (stubbed HTTP)", () => {
  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.enableNetConnect();
  });

  it("builds a Shop payload from domain input, maps success to RateQuote[], and acquires OAuth once", async () => {
    const env = setTestEnv();
    const http = new AxiosHttpClient(env.HTTP_TIMEOUT_MS);
    const cache = new MemoryStringCache();
    const rateService = createRateService("ups", { http, cache, env });

    const oauth = nock("https://wwwcie.ups.com")
      .post("/security/v1/oauth/token")
      .reply(200, oauthFixture);

    const rating = nock("https://wwwcie.ups.com")
      .post("/api/rating/v2409/Shop", (body: Record<string, unknown>) => {
        const rr = body.RateRequest as Record<string, unknown>;
        const req = rr.Request as Record<string, unknown>;
        const ship = rr.Shipment as Record<string, unknown>;
        const shipper = ship.Shipper as Record<string, unknown>;
        return (
          req.RequestOption === "Shop" &&
          shipper.ShipperNumber === "123456" &&
          Array.isArray(ship.Package) &&
          (ship.Package as unknown[]).length === 1
        );
      })
      .reply(200, rateSuccess);

    const quotes = await rateService.getRates(basePayload);

    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({
      carrierId: "ups",
      serviceCode: "03",
      serviceName: "Ground",
      totalCharge: { currency: "USD", amount: "12.34" },
      billingWeight: { unitCode: "LBS", weight: "2" },
      zone: "4",
    });
    expect(quotes[1]).toMatchObject({
      carrierId: "ups",
      serviceCode: "02",
      totalCharge: { currency: "USD", amount: "45.67" },
    });

    expect(oauth.isDone()).toBe(true);
    expect(rating.isDone()).toBe(true);
  });

  it("reuses a cached OAuth token on subsequent rate calls", async () => {
    const env = setTestEnv();
    const http = new AxiosHttpClient(env.HTTP_TIMEOUT_MS);
    const cache = new MemoryStringCache();
    const rateService = createRateService("ups", { http, cache, env });

    const oauth = nock("https://wwwcie.ups.com").post("/security/v1/oauth/token").times(1).reply(200, oauthFixture);

    nock("https://wwwcie.ups.com").post("/api/rating/v2409/Shop").times(2).reply(200, rateSuccess);

    await rateService.getRates(basePayload);
    await rateService.getRates(basePayload);

    expect(oauth.isDone()).toBe(true);
  });

  it("refreshes OAuth and retries rating after a 401 from the Rating API", async () => {
    const env = setTestEnv();
    const http = new AxiosHttpClient(env.HTTP_TIMEOUT_MS);
    const cache = new MemoryStringCache();
    const rateService = createRateService("ups", { http, cache, env });

    nock("https://wwwcie.ups.com").post("/security/v1/oauth/token").reply(200, oauthFixture);
    nock("https://wwwcie.ups.com").post("/api/rating/v2409/Shop").reply(401, rateError);
    nock("https://wwwcie.ups.com")
      .post("/security/v1/oauth/token")
      .reply(200, { ...oauthFixture, access_token: "fixture-access-token-2" });
    nock("https://wwwcie.ups.com").post("/api/rating/v2409/Shop").reply(200, rateSuccess);

    const quotes = await rateService.getRates(basePayload);
    expect(quotes.length).toBeGreaterThan(0);
  });

  it("maps UPS error envelopes to structured CarrierError", async () => {
    const env = setTestEnv();
    const http = new AxiosHttpClient(env.HTTP_TIMEOUT_MS);
    const cache = new MemoryStringCache();
    const rateService = createRateService("ups", { http, cache, env });

    nock("https://wwwcie.ups.com").post("/security/v1/oauth/token").reply(200, oauthFixture);
    nock("https://wwwcie.ups.com").post("/api/rating/v2409/Shop").reply(400, rateError);

    await expect(rateService.getRates(basePayload)).rejects.toMatchObject({
      code: "CARRIER_ERROR",
      httpStatus: 400,
    });
  });

  it("maps 429 to RATE_LIMITED", async () => {
    const env = setTestEnv();
    const http = new AxiosHttpClient(env.HTTP_TIMEOUT_MS);
    const cache = new MemoryStringCache();
    const rateService = createRateService("ups", { http, cache, env });

    nock("https://wwwcie.ups.com").post("/security/v1/oauth/token").reply(200, oauthFixture);
    nock("https://wwwcie.ups.com").post("/api/rating/v2409/Shop").reply(429, rateError);

    await expect(rateService.getRates(basePayload)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      httpStatus: 429,
    });
  });

  it("maps 5xx to HTTP_ERROR", async () => {
    const env = setTestEnv();
    const http = new AxiosHttpClient(env.HTTP_TIMEOUT_MS);
    const cache = new MemoryStringCache();
    const rateService = createRateService("ups", { http, cache, env });

    nock("https://wwwcie.ups.com").post("/security/v1/oauth/token").reply(200, oauthFixture);
    nock("https://wwwcie.ups.com").post("/api/rating/v2409/Shop").reply(503, { message: "unavailable" });

    await expect(rateService.getRates(basePayload)).rejects.toMatchObject({
      code: "HTTP_ERROR",
      httpStatus: 503,
    });
  });

  it("throws PARSE_ERROR when Rating returns JSON that does not match the expected schema", async () => {
    const env = setTestEnv();
    const http = new AxiosHttpClient(env.HTTP_TIMEOUT_MS);
    const cache = new MemoryStringCache();
    const rateService = createRateService("ups", { http, cache, env });

    nock("https://wwwcie.ups.com").post("/security/v1/oauth/token").reply(200, oauthFixture);
    nock("https://wwwcie.ups.com").post("/api/rating/v2409/Shop").reply(200, { unexpected: true });

    await expect(rateService.getRates(basePayload)).rejects.toMatchObject({
      code: "PARSE_ERROR",
    });
  });

  it("throws VALIDATION_FAILED for invalid domain input", async () => {
    const env = setTestEnv();
    const http = new AxiosHttpClient(env.HTTP_TIMEOUT_MS);
    const cache = new MemoryStringCache();
    const rateService = createRateService("ups", { http, cache, env });

    await expect(rateService.getRates({ ...basePayload, packages: [] })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

});
