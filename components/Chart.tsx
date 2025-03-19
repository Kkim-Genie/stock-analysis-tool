import React from "react";
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
import { Stock } from "../lib/types";

interface ChartProps {
  stocks: Stock[];
  selectedStocks: string[];
}

const Chart: React.FC<ChartProps> = ({ stocks, selectedStocks }) => {
  // 모든 날짜를 가져오고 중복 제거
  const allDates = Array.from(
    new Set(
      stocks
        .filter((stock) => selectedStocks.includes(stock.symbol))
        .flatMap((stock) => stock.data.map((d) => d.date))
    )
  ).sort();

  // 차트 데이터 생성
  const chartData = allDates.map((date) => {
    const dataPoint: Record<string, string | number> = { date };

    selectedStocks.forEach((symbol) => {
      const stock = stocks.find((s) => s.symbol === symbol);
      if (stock) {
        const dataOnDate = stock.data.find((d) => d.date === date);
        if (dataOnDate) {
          dataPoint[symbol] = dataOnDate.close;
        }
      }
    });

    return dataPoint;
  });

  // 색상 배열
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
  ];

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Stock Price Chart</h2>

      {selectedStocks.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval={Math.floor(chartData.length / 10)}
            />
            <YAxis />
            <Tooltip
              formatter={(value) => [
                `$${parseFloat(value as string).toFixed(2)}`,
                "",
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />

            {selectedStocks.map((symbol, index) => (
              <Line
                key={symbol}
                type="monotone"
                dataKey={symbol}
                stroke={colors[index % colors.length]}
                dot={false}
                name={`${symbol} - ${
                  stocks.find((s) => s.symbol === symbol)?.name || ""
                }`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-10 text-gray-500">
          Please select stocks to display
        </div>
      )}
    </div>
  );
};

export default Chart;
