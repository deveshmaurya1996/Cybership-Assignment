# Cybership Carrier Integration (UPS Rating)

TypeScript service that exposes **normalized rate shopping** behind a **carrier-agnostic** API. The UPS path implements the documented **[Rate](https://developer.ups.com/tag/Rating?loc=en_US#operation/Rate)** operation: `POST /rating/{version}/{requestoption}` with OAuth 2.0 client credentials (`client_secret_basic` per spec), `transId` / `transactionSrc` headers, and a `RATERequestWrapper` body as in the official `Rating.yaml`. Rate shopping uses `requestoption=Shop`. Live credentials are optional; integration tests stub HTTP.

## Architecture

- **Domain (`src/core`)** — Shared types (`RateRequest`, `RateQuote`), `Carrier` and `HttpClient` contracts, and `CarrierError` for structured failures. No Axios or UPS-specific code here.
- **Application (`src/application`)** — `RateService` validates input with **Zod** (`rateRequestInputSchema`) before calling a `Carrier`. Callers never see UPS JSON.
- **Carriers (`src/carriers`)** — `UpsCarrier` implements `Carrier` using a dedicated **OAuth client** (`UpsOAuthClient`) and **rating client** (`UpsRatingClient`). Mapping lives in `ups.mapper.ts`; raw UPS shapes and response validation live in `ups.types.ts`. A **FedEx** stub shows how another carrier plugs in without changing `RateService`.
- **Infrastructure (`src/infrastructure`)** — `AxiosHttpClient` wraps Axios with timeouts and maps transport failures to `CarrierError`. `MemoryStringCache` stores OAuth access tokens with TTL derived from `expires_in` (minus skew). Configuration is loaded via **Zod** from environment variables (`loadEnv`).
- **Factories (`src/factories`)** — Wire dependencies for a given carrier key (`"ups"` | `"fedex"`).

The **HTTP layer is abstracted** (`HttpClient` interface) so tests swap Nock-backed Axios without touching domain logic. **OAuth** is transparent to `RateService`: tokens are cached and invalidated on a **401** from the Rating API, then refreshed and the rating call is retried once.

## Prerequisites

- Node.js 18+

## Setup

```bash
npm install
cp .env.example .env
```

`.env.example` lists **demo placeholders** for required variables (URLs match UPS CIE). Replace `UPS_CLIENT_ID`, `UPS_CLIENT_SECRET`, and `UPS_SHIPPER_NUMBER` with real values from the UPS developer portal if you want live calls; otherwise rely on **`npm test`** (stubbed HTTP) as in the assignment brief.

## Scripts

| Command        | Description                                      |
| -------------- | ------------------------------------------------ |
| `npm run build` | Compile `src/` to `dist/`                       |
| `npm test`      | Jest integration + unit tests (stubbed HTTP)    |
| `npm run dev`   | Run sample CLI (`src/index.ts`) with dotenv     |
| `npm start`     | Run compiled CLI from `dist/`                   |

## GitHub

Create a repository under your GitHub account, then:

```bash
git init
git add .
git commit -m "Initial commit: UPS carrier integration service"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Share the repository URL with Cybership as requested.

## What I would improve with more time

- **Retries** for transient 5xx / network blips with jittered backoff (without retrying validation or 4xx).
- **Distributed token cache** (Redis) behind `StringCache` for multi-instance deployments.
- **Additional UPS operations** (labels, tracking) as separate small clients implementing a shared `CarrierOperation` pattern already sketched in `src/core/interfaces/carrier-operation.ts`.
- **Stronger UPS response typing** by generating types from the official OpenAPI (`Rating.yaml`) and tightening Zod schemas to match a pinned `UPS_RATING_VERSION`.
- **Observability**: structured logging, correlation IDs on `transId`, and redaction of secrets.

## License

Private / assessment use unless you add your own license.
