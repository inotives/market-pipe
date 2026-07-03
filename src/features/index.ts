import { alphaVantageFeature } from "./alphavantage/feature.js";
import { coingeckoFeature } from "./coingecko/feature.js";

export const features = [coingeckoFeature, alphaVantageFeature];
