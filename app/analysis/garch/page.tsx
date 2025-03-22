"use client";

import { useState, useEffect } from "react";
import GARCHAnalysis from "@/components/Analysis/GARCH";
import StockSelector from "@/components/StockSelector";
import { mockStocks } from "@/lib/mockData";
import { Stock, GARCHParams } from "@/lib/types";

export default function GARCHPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [targetStock, setTargetStock] = useState<string>("");
  const [featureStocks] = useState<string[]>([]);
  const [garchParams, setGarchParams] = useState<GARCHParams>({
    p: 1,
    q: 1,
    forecastSteps: 30,
  });

  // 데이터 로드
  useEffect(() => {
    const timer = setTimeout(() => {
      setStocks(mockStocks);
      // 모든 주식을 선택 가능한 목록으로 추가
      const symbols = mockStocks.map(stock => stock.symbol);
      setSelectedStocks(symbols);
      if (symbols.length > 0) {
        setTargetStock(symbols[0]);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 타겟 주식 선택 핸들러
  const handleTargetChange = (target: string) => {
    setTargetStock(target);
  };

  // 피처 주식 선택 핸들러 - GARCH에서는 사용하지 않음
  const handleFeatureChange = () => {};

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
          selectedStocks={selectedStocks}
          targetStock={targetStock}
          featureStocks={featureStocks}
          onTargetChange={handleTargetChange}
          onFeatureChange={handleFeatureChange}
          hideFeatureSelection={true}
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

      {targetStock && (
        <div className="card">
          <h2 className="section-title">분석 결과</h2>
          <GARCHAnalysis
            stocks={stocks}
            selectedStock={targetStock}
            params={garchParams}
          />
        </div>
      )}
    </div>
  );
}
