"use client";

import { useState, useEffect } from "react";
import ARIMAAnalysis from "@/components/Analysis/ARIMA";
import StockSelector from "@/components/StockSelector";
import { mockStocks } from "@/lib/mockData";
import { Stock, ARIMAParams } from "@/lib/types";

export default function ARIMAPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("");
  const [arimaParams, setArimaParams] = useState<ARIMAParams>({
    p: 5,
    d: 1,
    q: 0,
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
    setArimaParams((prev) => ({
      ...prev,
      [name]: parseInt(value),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">ARIMA 분석</h1>
        <p className="mb-4">
          ARIMA(Auto-Regressive Integrated Moving Average)는 시계열 예측에 널리
          사용되는 통계적 분석 방법입니다. 모델은 AR(자기회귀), I(적분),
          MA(이동평균) 세 가지 구성 요소를 결합합니다.
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              AR 차수 (p):
            </label>
            <input
              type="number"
              name="p"
              min="0"
              max="10"
              value={arimaParams.p}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              자기회귀 구성요소의 차수입니다.
            </p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              차분(Differencing) (d):
            </label>
            <input
              type="number"
              name="d"
              min="0"
              max="2"
              value={arimaParams.d}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              시계열 데이터를 정상화하기 위한 차분 횟수입니다.
            </p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              MA 차수 (q):
            </label>
            <input
              type="number"
              name="q"
              min="0"
              max="10"
              value={arimaParams.q}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              이동평균 구성요소의 차수입니다.
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
              value={arimaParams.forecastSteps}
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
          <ARIMAAnalysis
            stocks={stocks}
            selectedStock={selectedStock}
            params={arimaParams}
          />
        </div>
      )}
    </div>
  );
}
