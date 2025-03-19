import { Stock } from "./types";
import { subDays, format } from "date-fns";

// Generate mock data for the past 365 days
export const generateMockData = (): Stock[] => {
  const today = new Date();

  // Function to generate price data with some trend and randomness
  const generatePriceData = (
    startPrice: number,
    volatility: number,
    trend: number,
    seasonality: number = 0,
    seasonalityPeriod: number = 20
  ) => {
    const data = [];
    let price = startPrice;

    for (let i = 365; i >= 0; i--) {
      const date = subDays(today, i);
      // Add trend, seasonality, and random movement
      const randomFactor = (Math.random() - 0.5) * 2 * volatility;
      const trendFactor = trend;
      const seasonalFactor =
        seasonality * Math.sin((2 * Math.PI * i) / seasonalityPeriod);

      price = price * (1 + (randomFactor + trendFactor + seasonalFactor) / 100);
      // Ensure price doesn't go below 1
      price = Math.max(price, 1);

      data.push({
        date: format(date, "yyyy-MM-dd"),
        close: parseFloat(price.toFixed(2)),
      });
    }

    return data;
  };

  // Create mock stocks with different characteristics
  return [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      data: generatePriceData(150, 1.5, 0.02, 0.5, 60),
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      data: generatePriceData(300, 1.2, 0.03, 0.3, 45),
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      data: generatePriceData(2800, 1.8, 0.01, 0.7, 30),
    },
    {
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      data: generatePriceData(3200, 2.0, 0.02, 0.8, 50),
    },
    {
      symbol: "TSLA",
      name: "Tesla, Inc.",
      data: generatePriceData(700, 3.5, 0.04, 1.2, 25),
    },
  ];
};

// Export the mock data
export const mockStocks = generateMockData();
