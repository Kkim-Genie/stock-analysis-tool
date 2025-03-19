import React, { useState, useCallback } from "react";
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
import { CustomIndicator } from "../../lib/types";
import { parseCSVToCustomIndicator } from "../../lib/utils";

interface CustomIndicatorAnalysisProps {
  stockSymbol: string;
}

const CustomIndicatorAnalysis: React.FC<CustomIndicatorAnalysisProps> = ({
  stockSymbol,
}) => {
  const [indicators, setIndicators] = useState<CustomIndicator[]>([]);
  const [indicatorName, setIndicatorName] =
    useState<string>("Custom Indicator");
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvContent = e.target?.result as string;
          if (!csvContent) {
            throw new Error("Failed to read file");
          }

          const parsedData = parseCSVToCustomIndicator(csvContent);
          if (parsedData.length === 0) {
            throw new Error("No valid data found in CSV");
          }

          setIndicators(parsedData);
          setError(null);
        } catch (err) {
          setError(
            `Error parsing CSV: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      };

      reader.onerror = () => {
        setError("Error reading file");
      };

      reader.readAsText(file);
    },
    []
  );

  const handleManualInput = useCallback(() => {
    const textarea = document.getElementById(
      "manualInputArea"
    ) as HTMLTextAreaElement;
    const name = document.getElementById("indicatorName") as HTMLInputElement;

    if (textarea && textarea.value) {
      try {
        const parsedData = parseCSVToCustomIndicator(textarea.value);
        if (parsedData.length === 0) {
          throw new Error("No valid data found in input");
        }

        setIndicators(parsedData);

        if (name && name.value) {
          setIndicatorName(name.value);
        }

        setError(null);
      } catch (err) {
        setError(
          `Error parsing input: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    } else {
      setError("Please enter data in CSV format");
    }
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Custom Indicator</h2>

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-medium mb-3">
          Upload or Enter Indicator Data
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">
              Indicator Name
            </label>
            <input
              id="indicatorName"
              type="text"
              className="p-2 border rounded w-full"
              placeholder="Enter indicator name"
              defaultValue={indicatorName}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">
              Upload CSV File (date,value format)
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm border border-gray-300 rounded p-2"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">
              Or Enter CSV Data Manually
            </label>
            <textarea
              id="manualInputArea"
              className="w-full p-2 border rounded h-40 font-mono text-sm"
              placeholder="date,value&#10;2023-01-01,105.3&#10;2023-01-02,106.7&#10;..."
            ></textarea>
          </div>

          <button
            onClick={handleManualInput}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Process Data
          </button>

          {error && <div className="text-red-500 py-2">{error}</div>}
        </div>
      </div>

      {indicators.length > 0 && (
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="text-lg font-medium mb-3">
            {stockSymbol} - {indicatorName}
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={indicators}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval={Math.floor(indicators.length / 10)}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => [
                  `${parseFloat(value as string).toFixed(4)}`,
                  indicatorName,
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                name={indicatorName}
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CustomIndicatorAnalysis;
