import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Stock, RSIParams, AnalysisResult } from "../../lib/types";
import { calculateRSI } from "../../lib/utils";

interface RSIAnalysisProps {
  stocks: Stock[];
  selectedStock: string;
  params: RSIParams;
}

const RSIAnalysis: React.FC<RSIAnalysisProps> = ({
  stocks,
  selectedStock,
  params,
}) => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedStock) {
      setError("Please select a stock for RSI analysis");
      return;
    }

    const runRSIAnalysis = () => {
      try {
        setIsLoading(true);
        setError(null);

        // Find selected stock data
        const stock = stocks.find((s) => s.symbol === selectedStock);
        if (!stock) {
          throw new Error(`Stock ${selectedStock} not found`);
        }

        // Calculate RSI
        const rsiResults = calculateRSI(stock.data, params.period);
        setResults(rsiResults);
      } catch (err) {
        setError(
          `RSI analysis failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setIsLoading(false);
      }
    };

    runRSIAnalysis();
  }, [stocks, selectedStock, params]);

  if (isLoading) {
    return <div className="text-center py-10">Loading RSI analysis...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">
        Relative Strength Index (RSI) Analysis
      </h2>

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-medium mb-3">
          {selectedStock} - RSI ({params.period} periods)
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
            <YAxis domain={[0, 100]} />
            <Tooltip
              formatter={(value) => [
                `${parseFloat(value as string).toFixed(2)}`,
                "RSI",
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <ReferenceLine
              y={70}
              stroke="red"
              strokeDasharray="3 3"
              label="Overbought"
            />
            <ReferenceLine
              y={30}
              stroke="green"
              strokeDasharray="3 3"
              label="Oversold"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              name="RSI"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4">
          <p className="text-sm">
            <span className="font-semibold">Interpretation:</span>
          </p>
          <ul className="list-disc pl-5 text-sm mt-2">
            <li>
              <span className="text-red-600 font-medium">RSI &gt; 70:</span>{" "}
              Stock may be overbought (potential sell signal)
            </li>
            <li>
              <span className="text-green-600 font-medium">RSI &lt; 30:</span>{" "}
              Stock may be oversold (potential buy signal)
            </li>
            <li>
              <span className="font-medium">RSI Trend:</span> Direction can
              indicate continuing or potential trend reversal
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RSIAnalysis;
