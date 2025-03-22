"use client";

import { useState, useEffect } from "react";
import StockSelector from "@/components/StockSelector";
import { mockStocks } from "@/lib/mockData";
import { Stock, VARParams } from "@/lib/types";
import VARAnalysis from "@/components/Analysis/VAR";

export default function VARPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [targetStock, setTargetStock] = useState<string>("");
  const [featureStocks, setFeatureStocks] = useState<string[]>([]);
  const [varParams, setVarParams] = useState<VARParams>({
    lag: 3,
    forecastSteps: 20,
  });
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    // 데이터 로딩 지연 (최적화)
    const timer = setTimeout(() => {
      setStocks(mockStocks);

      // 모든 주식을 선택 가능한 목록으로 추가
      setSelectedStocks(mockStocks.map(stock => stock.symbol));
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);



  // 파라미터 변경 핸들러
  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);

    // 매개변수 제한 (최적화)
    if (name === "lag" && numValue > 10) {
      alert("지연(Lag) 기간은 최대 10으로 제한됩니다.");
      setVarParams((prev) => ({
        ...prev,
        [name]: 10,
      }));
    } else if (name === "forecastSteps" && numValue > 50) {
      alert("예측 기간은 최대 50으로 제한됩니다.");
      setVarParams((prev) => ({
        ...prev,
        [name]: 50,
      }));
    } else {
      setVarParams((prev) => ({
        ...prev,
        [name]: numValue,
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">벡터 자기회귀(VAR) 분석</h1>
        <p className="mb-4">
          벡터 자기회귀(Vector Auto Regression) 모델은 여러 시계열 변수 간의
          선형적 의존성을 분석하고 예측하는 데 사용됩니다.
        </p>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700">
            <strong>성능 고려사항:</strong> VAR 분석은 컴퓨터 자원을 많이
            사용하는 작업입니다. 분석 시작 버튼을 클릭하기 전까지는 계산이
            시작되지 않습니다.
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">분석 설정</h2>

        <div className="mb-4">
          <StockSelector
            stocks={stocks}
            selectedStocks={selectedStocks}
            targetStock={targetStock}
            featureStocks={featureStocks}
            onTargetChange={setTargetStock}
            onFeatureChange={setFeatureStocks}
            onChange={(selected) => {
              setSelectedStocks(selected);
              if (selected.length > 0) {
                setTargetStock(selected[0]);
              }
            }}
            multiple={true}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          최대 3개의 주식을 선택할 수 있습니다. 더 많은 주식을 선택하면 계산
          부하가 크게 증가합니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              지연(Lag) 기간:
            </label>
            <input
              type="number"
              name="lag"
              min="1"
              max="10"
              value={varParams.lag}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              과거 몇 개의 시점을 고려할지 설정합니다. (권장: 1-5)
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
              max="50"
              value={varParams.forecastSteps}
              onChange={handleParamChange}
              className="input-field w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              미래 몇 일을 예측할지 설정합니다. (권장: 10-30)
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">분석 결과</h2>

        {selectedStocks.length > 0 ? (
          <VARAnalysis
            stocks={stocks}
            targetStock={targetStock}
            featureStocks={featureStocks}
            params={varParams}
          />
        ) : (
          <div className="text-center py-6 text-gray-500">
            주식을 선택하여 VAR 분석을 시작하세요.
          </div>
        )}
      </div>
    </div>
  );
}
