import React, { useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import { Stock, CorrelationResult } from "../../lib/types";

interface CorrelationAnalysisProps {
  stocks: Stock[];
  selectedStocks: string[];
}

const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({
  stocks,
  selectedStocks,
}) => {
  const [results, setResults] = useState<CorrelationResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStocks.length < 2) {
      setError("Please select at least two stocks for correlation analysis");
      return;
    }

    const runCorrelationAnalysis = () => {
      try {
        setIsLoading(true);
        setError(null);

        const correlationResults: CorrelationResult[] = [];

        // Calculate correlations for each pair of stocks
        for (let i = 0; i < selectedStocks.length - 1; i++) {
          for (let j = i + 1; j < selectedStocks.length; j++) {
            const stock1Symbol = selectedStocks[i];
            const stock2Symbol = selectedStocks[j];

            const stock1 = stocks.find((s) => s.symbol === stock1Symbol);
            const stock2 = stocks.find((s) => s.symbol === stock2Symbol);

            if (!stock1 || !stock2) {
              throw new Error(
                `Stock not found: ${!stock1 ? stock1Symbol : stock2Symbol}`
              );
            }

            // Align dates (only use common dates)
            const stock1Dates = new Set(stock1.data.map((d) => d.date));
            const commonDates = stock2.data
              .filter((d) => stock1Dates.has(d.date))
              .map((d) => d.date);

            if (commonDates.length < 30) {
              throw new Error(
                `Not enough common data points for ${stock1Symbol} and ${stock2Symbol}`
              );
            }

            const stock1Values: number[] = [];
            const stock2Values: number[] = [];

            commonDates.forEach((date) => {
              const s1Data = stock1.data.find((d) => d.date === date);
              const s2Data = stock2.data.find((d) => d.date === date);

              if (s1Data && s2Data) {
                stock1Values.push(s1Data.close);
                stock2Values.push(s2Data.close);
              }
            });

            // Calculate correlation using TensorFlow.js
            const tensor1 = tf.tensor1d(stock1Values);
            const tensor2 = tf.tensor1d(stock2Values);

            const mean1 = tensor1.mean();
            const mean2 = tensor2.mean();

            const centered1 = tensor1.sub(mean1);
            const centered2 = tensor2.sub(mean2);

            const numerator = centered1.mul(centered2).sum();

            const denom1 = centered1.square().sum().sqrt();
            const denom2 = centered2.square().sum().sqrt();

            const correlation = numerator.div(denom1.mul(denom2));

            correlationResults.push({
              stock1: stock1Symbol,
              stock2: stock2Symbol,
              correlation: correlation.dataSync()[0],
              dates: commonDates,
              values1: stock1Values,
              values2: stock2Values,
            });

            // Clean up tensors
            tensor1.dispose();
            tensor2.dispose();
            mean1.dispose();
            mean2.dispose();
            centered1.dispose();
            centered2.dispose();
            numerator.dispose();
            denom1.dispose();
            denom2.dispose();
            correlation.dispose();
          }
        }

        setResults(correlationResults);
      } catch (err) {
        setError(
          `Correlation analysis failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setIsLoading(false);
      }
    };

    runCorrelationAnalysis();
  }, [stocks, selectedStocks]);

  // Prepare scatter plot data
  const prepareScatterData = (result: CorrelationResult) => {
    return result.values1.map((v1, idx) => ({
      x: v1,
      y: result.values2[idx],
      date: result.dates[idx],
    }));
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">Loading correlation analysis...</div>
    );
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Correlation Analysis</h2>

      {results.map((result) => (
        <div
          key={`${result.stock1}-${result.stock2}`}
          className="border rounded-lg p-4 bg-white"
        >
          <h3 className="text-lg font-medium mb-2">
            {result.stock1} vs {result.stock2}
          </h3>

          <div className="mb-4">
            <span className="font-semibold">Correlation: </span>
            <span
              className={`${
                Math.abs(result.correlation) > 0.7
                  ? "text-red-600"
                  : Math.abs(result.correlation) > 0.3
                  ? "text-yellow-600"
                  : "text-green-600"
              }`}
            >
              {result.correlation.toFixed(4)}
            </span>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey="x" name={result.stock1} unit="$" />
              <YAxis type="number" dataKey="y" name={result.stock2} unit="$" />
              <ZAxis range={[50, 50]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value) => [
                  `$${parseFloat(value as string).toFixed(2)}`,
                  "",
                ]}
                labelFormatter={(_, data) => {
                  const item = data[0]?.payload;
                  if (item) {
                    return `Date: ${item.date}\n${
                      result.stock1
                    }: $${item.x.toFixed(2)}\n${
                      result.stock2
                    }: $${item.y.toFixed(2)}`;
                  }
                  return "";
                }}
              />
              <Legend />
              <Scatter
                name={`${result.stock1} vs ${result.stock2}`}
                data={prepareScatterData(result)}
                fill="#8884d8"
              />
            </ScatterChart>
          </ResponsiveContainer>

          {/* Linear regression line would be added here */}
        </div>
      ))}
    </div>
  );
};

export default CorrelationAnalysis;
