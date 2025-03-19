// Types for stock data
export interface StockData {
  date: string;
  close: number;
}

// Types for analysis results
export interface AnalysisResult {
  date: string;
  value: number;
  prediction?: number;
}

// Type for correlation analysis
export interface CorrelationResult {
  stock1: string;
  stock2: string;
  correlation: number;
  dates: string[];
  values1: number[];
  values2: number[];
}

// Types for custom indicators
export interface CustomIndicator {
  date: string;
  value: number;
}

// Stock with its data
export interface Stock {
  symbol: string;
  name: string;
  data: StockData[];
}

// RSI parameters
export interface RSIParams {
  period: number;
}

// MACD parameters
export interface MACDParams {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

// ARIMA parameters
export interface ARIMAParams {
  p: number; // AR order
  d: number; // Differencing order
  q: number; // MA order
  forecastSteps: number;
}

// VAR parameters
export interface VARParams {
  lag: number;
  forecastSteps: number;
}

// GARCH parameters
export interface GARCHParams {
  p: number; // GARCH order
  q: number; // ARCH order
  forecastSteps: number;
}

// Parameters for all analysis methods
export type AnalysisParams =
  | RSIParams
  | MACDParams
  | ARIMAParams
  | VARParams
  | GARCHParams;

// Type for the analysis method
export type AnalysisMethod =
  | "VAR"
  | "ARIMA"
  | "GARCH"
  | "Correlation"
  | "RSI"
  | "MACD"
  | "Custom";
