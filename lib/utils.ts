import * as tf from "@tensorflow/tfjs";
import { StockData, AnalysisResult, CustomIndicator } from "./types";

// Convert stock data to tensor format
export const stockDataToTensor = (data: StockData[]): tf.Tensor => {
  const closes = data.map((item) => item.close);
  return tf.tensor1d(closes);
};

// formatAnalysisResults 함수 수정 - 예측은 마지막 실제 데이터 이후부터 표시
export const formatAnalysisResults = (
  dates: string[],
  values: number[],
  predictions?: number[]
): AnalysisResult[] => {
  const results: AnalysisResult[] = [];

  // 실제 데이터 포맷팅
  for (let i = 0; i < values.length; i++) {
    results.push({
      date: dates[i],
      value: values[i],
    });
  }

  // 예측 데이터가 있는 경우
  if (predictions && predictions.length > 0) {
    // 마지막 날짜 이후의 날짜 생성
    const lastDate = new Date(dates[dates.length - 1]);

    for (let i = 0; i < predictions.length; i++) {
      // 마지막 날짜 + (i+1)일
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + i + 1);

      // 날짜 포맷 yyyy-MM-dd
      const dateStr = nextDate.toISOString().split("T")[0];

      // 결과에 추가
      results.push({
        date: dateStr,
        value: null as unknown as number, // 실제 값은 없음
        prediction: predictions[i],
      });
    }
  }

  return results;
};

// Calculate Relative Strength Index (RSI)
export const calculateRSI = (
  data: StockData[],
  period: number
): AnalysisResult[] => {
  if (data.length <= period) {
    throw new Error(
      `Not enough data for RSI calculation with period ${period}`
    );
  }

  const closes = data.map((d) => d.close);
  const gains: number[] = [];
  const losses: number[] = [];

  // First, calculate gains and losses
  for (let i = 1; i < closes.length; i++) {
    const difference = closes[i] - closes[i - 1];
    gains.push(difference > 0 ? difference : 0);
    losses.push(difference < 0 ? Math.abs(difference) : 0);
  }

  const results: AnalysisResult[] = [];

  // Calculate initial averages
  let avgGain =
    gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  // First RSI value
  let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
  let rsi = 100 - 100 / (1 + rs);

  results.push({
    date: data[period].date,
    value: parseFloat(rsi.toFixed(2)),
  });

  // Calculate remaining RSI values
  for (let i = period; i < gains.length; i++) {
    // Smoothed averages
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
    rsi = 100 - 100 / (1 + rs);

    results.push({
      date: data[i + 1].date,
      value: parseFloat(rsi.toFixed(2)),
    });
  }

  return results;
};

// Calculate Moving Average Convergence Divergence (MACD)
export const calculateMACD = (
  data: StockData[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): AnalysisResult[] => {
  if (data.length <= slowPeriod + signalPeriod) {
    throw new Error(`Not enough data for MACD calculation`);
  }

  const closes = data.map((d) => d.close);

  // Calculate EMAs
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = 0; i < fastEMA.length; i++) {
    if (i >= slowEMA.length - fastEMA.length) {
      const slowIndex = i - (slowEMA.length - fastEMA.length);
      macdLine.push(fastEMA[i] - slowEMA[slowIndex]);
    }
  }

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Calculate MACD histogram (MACD line - signal line)
  const histogram: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(
      macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i]
    );
  }

  // Prepare result
  const results: AnalysisResult[] = [];
  const startIndex = data.length - histogram.length;

  for (let i = 0; i < histogram.length; i++) {
    results.push({
      date: data[startIndex + i].date,
      value: parseFloat(histogram[i].toFixed(4)),
    });
  }

  return results;
};

// Helper function to calculate Exponential Moving Average (EMA)
const calculateEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaResults: number[] = [];

  // First EMA is the SMA
  const sma =
    data.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  emaResults.push(sma);

  // Calculate remaining EMAs
  for (let i = period; i < data.length; i++) {
    const ema = data[i] * k + emaResults[emaResults.length - 1] * (1 - k);
    emaResults.push(ema);
  }

  return emaResults;
};

// Prepare data for ARIMA model
export const prepareARIMAData = (data: StockData[], d: number): number[] => {
  let prices = data.map((item) => item.close);

  // Apply differencing d times
  for (let i = 0; i < d; i++) {
    const diffPrices: number[] = [];
    for (let j = 1; j < prices.length; j++) {
      diffPrices.push(prices[j] - prices[j - 1]);
    }
    prices = diffPrices;
  }

  return prices;
};

// Create lagged dataset for time series analysis
export const createLaggedDataset = (
  data: number[],
  lagSteps: number
): [tf.Tensor2D, tf.Tensor2D] => {
  const X: number[][] = [];
  const y: number[] = [];

  for (let i = lagSteps; i < data.length; i++) {
    X.push(data.slice(i - lagSteps, i));
    y.push(data[i]);
  }

  return [tf.tensor2d(X), tf.tensor2d(y, [y.length, 1])];
};

// Function to parse CSV data for custom indicators
export const parseCSVToCustomIndicator = (
  csvContent: string
): CustomIndicator[] => {
  const lines = csvContent.trim().split("\n");
  const results: CustomIndicator[] = [];

  // Skip header if present
  const startLine =
    lines[0].includes("date") || lines[0].includes("Date") ? 1 : 0;

  for (let i = startLine; i < lines.length; i++) {
    const [date, valueStr] = lines[i].split(",");
    const value = parseFloat(valueStr.trim());

    if (!isNaN(value) && date) {
      results.push({
        date: date.trim(),
        value,
      });
    }
  }

  return results;
};

// Helper function to normalize data for models
export const normalizeData = (
  data: number[]
): [tf.Tensor1D, number, number] => {
  const tensor = tf.tensor1d(data);
  const min = tensor.min().dataSync()[0];
  const max = tensor.max().dataSync()[0];

  // 명시적으로 Tensor1D 타입으로 캐스팅
  const normalizedTensor = tensor.sub(min).div(max - min) as tf.Tensor1D;
  return [normalizedTensor, min, max];
};

// Helper function to denormalize data
export const denormalizeData = (
  normalizedData: tf.Tensor | number[],
  min: number,
  max: number
): number[] => {
  const tensor =
    normalizedData instanceof tf.Tensor
      ? normalizedData
      : tf.tensor(normalizedData);

  const denormalized = tensor.mul(max - min).add(min);
  return Array.from(denormalized.dataSync());
};
