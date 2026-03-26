import axios from "axios";
import { AxiosHttpClient } from "../../src/infrastructure/http/axios.client";
describe("AxiosHttpClient", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps axios ECONNABORTED to CarrierError TIMEOUT", async () => {
    const err = Object.assign(new Error("timeout"), {
      isAxiosError: true,
      code: "ECONNABORTED",
    });
    jest.spyOn(axios, "request").mockRejectedValueOnce(err);

    const client = new AxiosHttpClient(5000);

    await expect(
      client.request({ url: "https://example.com/test", method: "GET" })
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });
});
