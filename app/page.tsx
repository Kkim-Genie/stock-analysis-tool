"use client";

import { useState, useEffect } from "react";
import Chart from "@/components/Chart";
import { mockStocks } from "@/lib/mockData";
import { Stock } from "@/lib/types";
import StockSelector from "@/components/StockSelector";

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);

  // 데이터 로드
  useEffect(() => {
    setStocks(mockStocks);

    // 첫 번째 주식을 기본 선택
    if (mockStocks.length > 0) {
      setSelectedStocks([mockStocks[0].symbol]);
    }
  }, []);

  // 주식 선택 핸들러
  const handleStockSelection = (symbols: string[]) => {
    setSelectedStocks(symbols);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">주식 데이터 분석</h1>
        <p className="mb-4">
          이 애플리케이션은 다양한 주식 데이터 분석 도구를 제공합니다.
          Tensorflow.js를 사용하여 클라이언트 측에서 분석이 수행됩니다.
        </p>
        <p>
          메뉴에서 원하는 분석 도구를 선택하거나, 아래에서 주식 차트를
          확인하세요.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">주식 차트</h2>
        <StockSelector
          stocks={stocks}
          selectedStocks={selectedStocks}
          onChange={handleStockSelection}
          multiple={true}
        />

        {stocks.length > 0 && (
          <div className="mt-6">
            <Chart stocks={stocks} selectedStocks={selectedStocks} />
          </div>
        )}
      </div>
    </div>
  );
}
