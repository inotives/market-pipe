import { agentLocalFeature } from "./agent_local/feature.js";
import { alphaVantageFeature } from "./alphavantage/feature.js";
import { coingeckoFeature } from "./coingecko/feature.js";
import { customCsvFeature } from "./custom_csv/feature.js";

export const features = [coingeckoFeature, alphaVantageFeature, customCsvFeature, agentLocalFeature];
