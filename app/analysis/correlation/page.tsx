"use client";

import { useState, useEffect } from "react";
import CorrelationAnalysis from "@/components/Analysis/Correlation";
import StockSelector from "@/components/StockSelector";
import { mockStocks } from "@/lib/mockData";
import { Stock } from "@/lib/types";

export default function CorrelationPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);

  // 데이터 로드
  useEffect(() => {
    setStocks(mockStocks);

    // 첫 번째와 두 번째 주식을 기본 선택
    if (mockStocks.length >= 2) {
      setSelectedStocks([mockStocks[0].symbol, mockStocks[1].symbol]);
    } else if (mockStocks.length === 1) {
      setSelectedStocks([mockStocks[0].symbol]);
    }
  }, []);

  // 주식 선택 핸들러
  const handleStockSelection = (symbols: string[]) => {
    setSelectedStocks(symbols);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">상관관계 분석</h1>
        <p className="mb-4">
          상관관계 분석은 두 개 이상의 주식 간의 가격 움직임 관계를 측정합니다.
          양의 상관관계는 가격이 같은 방향으로 움직이는 경향을 나타내고, 음의
          상관관계는 가격이 반대 방향으로 움직이는 경향을 나타냅니다.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">분석 설정</h2>

        <StockSelector
          stocks={stocks}
          selectedStocks={selectedStocks}
          onChange={handleStockSelection}
          multiple={true}
        />

        <p className="text-sm mb-4">
          상관관계 분석을 위해 최소 2개 이상의 주식을 선택하세요.
        </p>
      </div>

      {selectedStocks.length >= 2 ? (
        <div className="card">
          <h2 className="section-title">분석 결과</h2>
          <CorrelationAnalysis
            stocks={stocks}
            selectedStocks={selectedStocks}
          />
        </div>
      ) : (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="text-yellow-700">
            <h2 className="section-title text-yellow-800">주의</h2>
            <p>상관관계 분석을 위해 최소 2개 이상의 주식을 선택해주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
