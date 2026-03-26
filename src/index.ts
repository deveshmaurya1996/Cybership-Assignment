import "dotenv/config";
import { loadEnv } from "./infrastructure/config/env";
import { AxiosHttpClient } from "./infrastructure/http/axios.client";
import { MemoryStringCache } from "./infrastructure/cache/memory.cache";
import { createRateService } from "./factories/service.factory";

async function main(): Promise<void> {
  const env = loadEnv();
  const http = new AxiosHttpClient(env.HTTP_TIMEOUT_MS);
  const cache = new MemoryStringCache();
  const rateService = createRateService("ups", { http, cache, env });

  const sample = {
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

  try {
    const quotes = await rateService.getRates(sample);
    console.log(JSON.stringify(quotes, null, 2));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}

void main();
