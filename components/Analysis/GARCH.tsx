import React, { useState, useEffect } from "react";
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
import { Stock, GARCHParams, AnalysisResult } from "../../lib/types";
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

const GARCHAnalysis: React.FC<GARCHAnalysisProps> = ({
  stocks,
  selectedStock,
  params,
}) => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [volatilityResults, setVolatilityResults] = useState<AnalysisResult[]>(
    []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedStock) {
      setError("Please select a stock for GARCH analysis");
      return;
    }

    const runGARCHAnalysis = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Find selected stock data
        const stock = stocks.find((s) => s.symbol === selectedStock);
        if (!stock) {
          throw new Error(`Stock ${selectedStock} not found`);
        }

        // Calculate returns
        const prices = stock.data.map((d) => d.close);
        const returns: number[] = [];

        for (let i = 1; i < prices.length; i++) {
          // Log returns: ln(P_t / P_{t-1})
          returns.push(Math.log(prices[i] / prices[i - 1]));
        }

        // Normalize returns
        const [normalizedReturns, minReturn, maxReturn] =
          normalizeData(returns);
        const returnsArray = Array.from(normalizedReturns.dataSync());

        // Train GARCH model
        const { predictedReturns, predictedVolatility } = await trainGARCHModel(
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

        // Format volatility results
        // We'll use dates starting from the second point (since we lose one for returns calculation)
        const volatilityDates = stock.data
          .slice(1)
          .map((d) => d.date)
          .concat(forecastDates);
        const volatilityValues = formatAnalysisResults(
          volatilityDates,
          Array(returns.length)
            .fill(0)
            .map((_, i) => Math.sqrt(Math.abs(returns[i]))),
          predictedVolatility
        );

        setResults(priceResults);
        setVolatilityResults(volatilityValues);
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

    runGARCHAnalysis();
  }, [stocks, selectedStock, params]);

  // GARCH model implementation using TensorFlow.js
  const trainGARCHModel = async (
    returns: number[],
    p: number, // GARCH order
    q: number, // ARCH order
    forecastSteps: number
  ): Promise<{ predictedReturns: number[]; predictedVolatility: number[] }> => {
    const lag = Math.max(p, q);

    if (returns.length <= lag) {
      throw new Error(`Not enough data for GARCH model with lag ${lag}`);
    }

    // Create datasets for returns model and volatility model
    const returnSquared = returns.map((r) => r * r);

    // Create features: lagged returns and lagged squared returns
    const features: number[][] = [];
    const returnTargets: number[] = [];
    const volTargets: number[] = [];

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
      volTargets.push(returnSquared[i]);
    }

    // Convert to tensors
    const X = tf.tensor2d(features);
    const yReturns = tf.tensor2d(returnTargets, [returnTargets.length, 1]);
    const yVol = tf.tensor2d(volTargets, [volTargets.length, 1]);

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

    // Train volatility model
    const volModel = tf.sequential();

    volModel.add(
      tf.layers.dense({
        units: 20,
        activation: "relu",
        inputShape: [p + q],
      })
    );

    volModel.add(
      tf.layers.dense({
        units: 1,
        activation: "relu", // Volatility is non-negative
      })
    );

    volModel.compile({
      optimizer: tf.train.adam(),
      loss: "meanSquaredError",
    });

    await volModel.fit(X, yVol, {
      epochs: 100,
      batchSize: 32,
      verbose: 0,
    });

    // Generate forecasts
    const predictedReturns: number[] = [];
    const predictedVolatility: number[] = [];

    // Start with the last observations
    const lastReturns = returns.slice(-p);
    const lastReturnSquared = returnSquared.slice(-q);

    // Generate forecasts recursively
    for (let i = 0; i < forecastSteps; i++) {
      // Prepare input features
      const inputFeatures: number[] = [
        ...lastReturns.slice(-p),
        ...lastReturnSquared.slice(-q),
      ];

      const input = tf.tensor2d([inputFeatures], [1, p + q]);

      // Predict return
      const returnPred = returnsModel.predict(input) as tf.Tensor;
      const returnValue = returnPred.dataSync()[0];

      // Predict volatility
      const volPred = volModel.predict(input) as tf.Tensor;
      const volValue = volPred.dataSync()[0];

      predictedReturns.push(returnValue);
      predictedVolatility.push(Math.sqrt(Math.abs(volValue))); // Convert to standard deviation

      // Update for next iteration
      lastReturns.shift();
      lastReturns.push(returnValue);

      lastReturnSquared.shift();
      lastReturnSquared.push(returnValue * returnValue);

      // Clean up tensors
      input.dispose();
      returnPred.dispose();
      volPred.dispose();
    }

    // Clean up
    X.dispose();
    yReturns.dispose();
    yVol.dispose();
    returnsModel.dispose();
    volModel.dispose();

    return { predictedReturns, predictedVolatility };
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading GARCH analysis...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">GARCH Analysis</h2>

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

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-medium mb-3">
          {selectedStock} - Volatility Forecast
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={volatilityResults}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval={Math.floor(volatilityResults.length / 10)}
            />
            <YAxis />
            <Tooltip
              formatter={(value) => [
                `${parseFloat(value as string).toFixed(4)}`,
                "Volatility",
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#82ca9d"
              name="Historical"
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
    </div>
  );
};

export default GARCHAnalysis;
