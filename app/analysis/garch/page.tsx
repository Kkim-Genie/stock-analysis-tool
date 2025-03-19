"use client";

import { useState, useEffect } from "react";
import GARCHAnalysis from "@/components/Analysis/GARCH";
import StockSelector from "@/components/StockSelector";
import { mockStocks } from "@/lib/mockData";
import { Stock, GARCHParams } from "@/lib/types";

export default function GARCHPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("");
  const [garchParams, setGarchParams] = useState<GARCHParams>({
    p: 1,
    q: 1,
    forecastSteps: 30,
  });

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

  // 파라미터 변경 핸들러
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGarchParams((prev) => ({
      ...prev,
      [name]: parseInt(value),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">GARCH 분석</h1>
        <p className="mb-4">
          GARCH(Generalized Autoregressive Conditional Heteroskedasticity)는
          시계열 데이터의 변동성을 모델링하고 예측하는 데 사용되는 분석
          방법입니다. 특히 주식 가격과 같이, 시간이 지남에 따라 변동성이 변하는
          데이터에 유용합니다.
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              GARCH 차수 (p):
            </label>
            <input
              type="number"
              name="p"
              min="1"
              max="5"
              value={garchParams.p}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              변동성 항의 차수입니다. (일반적으로 1)
            </p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              ARCH 차수 (q):
            </label>
            <input
              type="number"
              name="q"
              min="1"
              max="5"
              value={garchParams.q}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              제곱 오차항의 차수입니다. (일반적으로 1)
            </p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              예측 기간:
            </label>
            <input
              type="number"
              name="forecastSteps"
              min="1"
              max="100"
              value={garchParams.forecastSteps}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              미래 몇 일을 예측할지 설정합니다.
            </p>
          </div>
        </div>
      </div>

      {selectedStock && (
        <div className="card">
          <h2 className="section-title">분석 결과</h2>
          <GARCHAnalysis
            stocks={stocks}
            selectedStock={selectedStock}
            params={garchParams}
          />
        </div>
      )}
    </div>
  );
}
