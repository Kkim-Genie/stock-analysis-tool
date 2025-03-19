import React, { useState, useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  ComposedChart,
  Cell,
} from "recharts";
import { Stock, MACDParams, AnalysisResult } from "../../lib/types";
import { calculateMACD } from "../../lib/utils";

interface MACDAnalysisProps {
  stocks: Stock[];
  selectedStock: string;
  params: MACDParams;
}

const MACDAnalysis: React.FC<MACDAnalysisProps> = ({
  stocks,
  selectedStock,
  params,
}) => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedStock) {
      setError("Please select a stock for MACD analysis");
      return;
    }

    const runMACDAnalysis = () => {
      try {
        setIsLoading(true);
        setError(null);

        // Find selected stock data
        const stock = stocks.find((s) => s.symbol === selectedStock);
        if (!stock) {
          throw new Error(`Stock ${selectedStock} not found`);
        }

        // Calculate MACD
        const macdResults = calculateMACD(
          stock.data,
          params.fastPeriod,
          params.slowPeriod,
          params.signalPeriod
        );

        setResults(macdResults);
      } catch (err) {
        setError(
          `MACD analysis failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setIsLoading(false);
      }
    };

    runMACDAnalysis();
  }, [stocks, selectedStock, params]);

  if (isLoading) {
    return <div className="text-center py-10">Loading MACD analysis...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">MACD Analysis</h2>

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-medium mb-3">
          {selectedStock} - MACD ({params.fastPeriod}/{params.slowPeriod}/
          {params.signalPeriod})
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
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
                `${parseFloat(value as string).toFixed(4)}`,
                "MACD",
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Bar dataKey="value" name="MACD Histogram">
              {results.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.value >= 0 ? "#82ca9d" : "#ff7373"}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>

        <div className="mt-4">
          <p className="text-sm">
            <span className="font-semibold">Interpretation:</span>
          </p>
          <ul className="list-disc pl-5 text-sm mt-2">
            <li>
              <span className="font-medium">MACD Crossover:</span> When MACD
              crosses above the signal line, it&apos;s a potential buy signal
            </li>
            <li>
              <span className="font-medium">MACD Crossunder:</span> When MACD
              crosses below the signal line, it&apos;s a potential sell signal
            </li>
            <li>
              <span className="font-medium">Histogram:</span> Shows the
              difference between MACD and signal line
            </li>
            <li>
              <span className="font-medium">Zero Line Crossover:</span> MACD
              crossing above/below zero indicates potential trend changes
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MACDAnalysis;
