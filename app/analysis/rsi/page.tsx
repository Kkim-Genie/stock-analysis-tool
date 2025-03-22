"use client";

import { useState, useEffect } from "react";
import RSIAnalysis from "@/components/Analysis/RSI";
import StockSelector from "@/components/StockSelector";
import { mockStocks } from "@/lib/mockData";
import { Stock, RSIParams } from "@/lib/types";

export default function RSIPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("");
  const [rsiParams, setRsiParams] = useState<RSIParams>({
    period: 14,
  });

  // 데이터 로드
  useEffect(() => {
    const timer = setTimeout(() => {
      setStocks(mockStocks);
      // 첫 번째 주식을 기본 선택
      if (mockStocks.length > 0) {
        setSelectedStock(mockStocks[0].symbol);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 주식 선택 핸들러
  const handleStockSelection = (symbols: string[]) => {
    if (symbols && symbols.length > 0) {
      setSelectedStock(symbols[0]);
    } else {
      setSelectedStock("");
    }
  };

  // 파라미터 변경 핸들러
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRsiParams((prev) => ({
      ...prev,
      [name]: parseInt(value),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">RSI (상대강도지수) 분석</h1>
        <p className="mb-4">
          RSI(Relative Strength Index)는 주식 가격의 상승과 하락 속도를 측정하여
          과매수 및 과매도 상태를 나타내는 모멘텀 지표입니다. 일반적으로 70
          이상은 과매수, 30 이하는 과매도 상태로 간주됩니다.
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">분석 설정</h2>

        <StockSelector
          stocks={stocks}
          selectedStocks={selectedStock ? [selectedStock] : []}
          onChange={handleStockSelection}
          multiple={false}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              RSI 기간:
            </label>
            <input
              type="number"
              name="period"
              min="2"
              max="30"
              value={rsiParams.period}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              RSI 계산에 사용할 기간 수입니다. 일반적으로 14일을 사용합니다.
            </p>
          </div>
        </div>
      </div>

      {selectedStock && (
        <div className="card">
          <h2 className="section-title">분석 결과</h2>
          <RSIAnalysis
            stocks={stocks}
            selectedStock={selectedStock}
            params={rsiParams}
          />
        </div>
      )}
    </div>
  );
}
