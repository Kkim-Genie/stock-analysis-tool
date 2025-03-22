import React, { useState } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Stock, GARCHParams } from "../../lib/types";
import {
  formatAnalysisResults,
  normalizeData,
  denormalizeData,
} from "../../lib/utils";

interface GARCHAnalysisProps {
  stocks: Stock[];
  selectedStock: string;
  params: GARCHParams;
}

const GARCHAnalysis = ({
  stocks,
  selectedStock,
  params,
}: GARCHAnalysisProps) => {
  const [results, setResults] = useState<
    Array<{ date: string; value: number; prediction?: number }>
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartAnalysis = async () => {
    if (!selectedStock) {
      setError("Please select a stock for GARCH analysis");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Find selected stock data
      const stock = stocks.find((s: Stock) => s.symbol === selectedStock);
      if (!stock) {
        throw new Error(`Stock ${selectedStock} not found`);
      }

      // Calculate returns
      const prices = stock.data.map((d: { close: number }) => d.close);
      const returns: number[] = [];

      for (let i = 1; i < prices.length; i++) {
        // Log returns: ln(P_t / P_{t-1})
        returns.push(Math.log(prices[i] / prices[i - 1]));
      }

      // Normalize returns
      const [normalizedReturns, minReturn, maxReturn] = normalizeData(returns);
      const returnsArray = Array.from(normalizedReturns.dataSync());

      // Train GARCH model
      const { predictedReturns } = await trainGARCHModel(
        returnsArray,
        params.p,
        params.q,
        params.forecastSteps
      );

      // Denormalize the predicted returns
      const denormalizedReturns = denormalizeData(
        predictedReturns,
        minReturn,
        maxReturn
      );

      // Convert returns back to prices
      const lastPrice = stock.data[stock.data.length - 1].close;
      const predictedPrices: number[] = [];
      let currentPrice = lastPrice;

      for (const ret of denormalizedReturns) {
        currentPrice = currentPrice * Math.exp(ret);
        predictedPrices.push(currentPrice);
      }

      // Prepare dates for forecasts (assuming they continue sequentially)
      const lastDate = new Date(stock.data[stock.data.length - 1].date);
      const forecastDates: string[] = [];

      for (let i = 0; i < params.forecastSteps; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + i + 1);
        forecastDates.push(nextDate.toISOString().split("T")[0]);
      }

      // Format results
      const priceResults = formatAnalysisResults(
        stock.data.map((d) => d.date),
        prices,
        predictedPrices
      );

      setResults(priceResults);
    } catch (err) {
      setError(
        `GARCH analysis failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // GARCH model implementation using TensorFlow.js
  const trainGARCHModel = async (
    returns: number[],
    p: number, // GARCH order
    q: number, // ARCH order
    forecastSteps: number
  ): Promise<{ predictedReturns: number[] }> => {
    const lag = Math.max(p, q);

    if (returns.length <= lag) {
      throw new Error(`Not enough data for GARCH model with lag ${lag}`);
    }

    // Create datasets for returns model and volatility model
    const returnSquared = returns.map((r) => r * r);

    // Create features: lagged returns and lagged squared returns
    const features: number[][] = [];
    const returnTargets: number[] = [];

    for (let i = lag; i < returns.length; i++) {
      const row: number[] = [];

      // Add lagged returns (for AR component)
      for (let j = 1; j <= p; j++) {
        row.push(returns[i - j]);
      }

      // Add lagged squared returns (for ARCH component)
      for (let j = 1; j <= q; j++) {
        row.push(returnSquared[i - j]);
      }

      features.push(row);
      returnTargets.push(returns[i]);
    }

    // Convert to tensors
    const X = tf.tensor2d(features);
    const yReturns = tf.tensor2d(returnTargets, [returnTargets.length, 1]);

    // Train returns model
    const returnsModel = tf.sequential();

    returnsModel.add(
      tf.layers.dense({
        units: 20,
        activation: "relu",
        inputShape: [p + q],
      })
    );

    returnsModel.add(
      tf.layers.dense({
        units: 1,
      })
    );

    returnsModel.compile({
      optimizer: tf.train.adam(),
      loss: "meanSquaredError",
    });

    await returnsModel.fit(X, yReturns, {
      epochs: 100,
      batchSize: 32,
      verbose: 0,
    });

    // Generate forecasts
    const predictedReturns: number[] = [];
    let currentFeatures = features[features.length - 1];

    for (let i = 0; i < forecastSteps; i++) {
      const prediction = (
        returnsModel.predict(tf.tensor2d([currentFeatures])) as tf.Tensor
      ).dataSync()[0];

      predictedReturns.push(prediction);

      // Update features for next prediction
      currentFeatures = [
        prediction,
        ...currentFeatures.slice(0, p - 1),
        prediction * prediction,
        ...currentFeatures.slice(p, p + q - 1),
      ];
    }

    // Clean up
    X.dispose();
    yReturns.dispose();
    returnsModel.dispose();

    return { predictedReturns };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">GARCH Analysis</h2>
        <button
          onClick={handleStartAnalysis}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "분석 중..." : "분석 시작"}
        </button>
      </div>

      {error && (
        <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="text-lg font-medium mb-3">
            {selectedStock} - Price Forecast
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={results}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval={Math.floor(results.length / 10)}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => [
                  `${parseFloat(value as string).toFixed(2)}`,
                  "Price",
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                name="Actual"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="prediction"
                stroke="#ff7300"
                name="Forecast"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default GARCHAnalysis as React.FC<GARCHAnalysisProps>;
