"use client";

import { useState, useEffect } from "react";
import CustomIndicatorAnalysis from "@/components/Analysis/CustomIndicator";
import StockSelector from "@/components/StockSelector";
import { mockStocks } from "@/lib/mockData";
import { Stock } from "@/lib/types";

export default function CustomIndicatorPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("");

  // 데이터 로드
  useEffect(() => {
    setStocks(mockStocks);

    // 첫 번째 주식을 기본 선택
    if (mockStocks.length > 0) {
      setSelectedStock(mockStocks[0].symbol);
    }
  }, []);

  // 주식 선택 핸들러
  const handleStockSelection = (symbols: string[]) => {
    if (symbols.length > 0) {
      setSelectedStock(symbols[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">커스텀 지표 분석</h1>
        <p className="mb-4">
          자신만의 커스텀 지표 데이터를 업로드하거나 입력하여 분석할 수
          있습니다. CSV 형식(날짜,값)으로 데이터를 제공하세요.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">분석 설정</h2>

        <StockSelector
          stocks={stocks}
          selectedStocks={[selectedStock]}
          onChange={handleStockSelection}
          multiple={false}
        />

        <p className="text-sm mb-4">커스텀 지표와 비교할 주식을 선택하세요.</p>
      </div>

      {selectedStock && (
        <div className="card">
          <h2 className="section-title">커스텀 지표 데이터</h2>
          <CustomIndicatorAnalysis stockSymbol={selectedStock} />
        </div>
      )}
    </div>
  );
}
