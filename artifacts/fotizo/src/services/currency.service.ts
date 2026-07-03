import { api, USE_MOCKS } from "@/api";
import { delay } from "./mocks/delay";
import * as fx from "./mocks/fixtures";
import type { CurrencyRates } from "@/types";

export const currencyService = {
  async getRates(): Promise<CurrencyRates> {
    if (USE_MOCKS) {
      await delay();
      return fx.CURRENCY_RATES;
    }
    return api.get<CurrencyRates>("/currency/rates");
  },
};
