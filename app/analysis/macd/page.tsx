"use client";

import { useState, useEffect } from "react";
import MACDAnalysis from "@/components/Analysis/MACD";
import StockSelector from "@/components/StockSelector";
import { mockStocks } from "@/lib/mockData";
import { Stock, MACDParams } from "@/lib/types";

export default function MACDPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("");
  const [macdParams, setMacdParams] = useState<MACDParams>({
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
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
    setMacdParams((prev) => ({
      ...prev,
      [name]: parseInt(value),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">MACD 분석</h1>
        <p className="mb-4">
          MACD(Moving Average Convergence Divergence)는 단기 이동평균과 장기
          이동평균의 차이를 이용한 추세 추종 모멘텀 지표입니다. 이동평균의
          수렴과 발산을 시각화하여 추세 변화와 모멘텀을 파악하는 데 사용됩니다.
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
              단기 이동평균(Fast) 기간:
            </label>
            <input
              type="number"
              name="fastPeriod"
              min="3"
              max="30"
              value={macdParams.fastPeriod}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              일반적으로 12일을 사용합니다.
            </p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              장기 이동평균(Slow) 기간:
            </label>
            <input
              type="number"
              name="slowPeriod"
              min="5"
              max="50"
              value={macdParams.slowPeriod}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              일반적으로 26일을 사용합니다.
            </p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              시그널(Signal) 기간:
            </label>
            <input
              type="number"
              name="signalPeriod"
              min="2"
              max="20"
              value={macdParams.signalPeriod}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              일반적으로 9일을 사용합니다.
            </p>
          </div>
        </div>
      </div>

      {selectedStock && (
        <div className="card">
          <h2 className="section-title">분석 결과</h2>
          <MACDAnalysis
            stocks={stocks}
            selectedStock={selectedStock}
            params={macdParams}
          />
        </div>
      )}
    </div>
  );
}
