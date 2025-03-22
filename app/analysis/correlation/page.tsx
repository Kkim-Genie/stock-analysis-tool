"use client";

import { useState, useEffect } from "react";
import CorrelationAnalysis from "@/components/Analysis/Correlation";
import StockSelector from "@/components/StockSelector";
import { mockStocks } from "@/lib/mockData";
import { Stock, CorrelationResult } from "@/lib/types";

interface CorrelationStrength {
  level: string;
  description: string;
  color: string;
}

const getCorrelationStrength = (correlation: number): CorrelationStrength => {
  const absCorr = Math.abs(correlation);
  if (absCorr >= 0.7) {
    return {
      level: '강한 상관관계',
      description: correlation > 0 ? '두 주식이 매우 비슷한 방향으로 움직입니다.' : '두 주식이 매우 반대 방향으로 움직입니다.',
      color: 'text-blue-600'
    };
  } else if (absCorr >= 0.4) {
    return {
      level: '중간 상관관계',
      description: correlation > 0 ? '두 주식이 어느 정도 비슷한 방향으로 움직입니다.' : '두 주식이 어느 정도 반대 방향으로 움직입니다.',
      color: 'text-green-600'
    };
  } else {
    return {
      level: '약한 상관관계',
      description: '두 주식 간의 상관관계가 매우 약합니다.',
      color: 'text-gray-600'
    };
  }
};

export default function CorrelationPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [targetStock, setTargetStock] = useState<string>("");
  const [featureStocks, setFeatureStocks] = useState<string[]>([]);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [correlationResults, setCorrelationResults] = useState<CorrelationResult[]>([]);

  // 데이터 로드
  useEffect(() => {
    const timer = setTimeout(() => {
      setStocks(mockStocks);
      // 모든 주식을 선택 가능한 목록으로 추가
      const symbols = mockStocks.map(stock => stock.symbol);
      if (symbols.length >= 2) {
        setSelectedStocks(symbols);
        setTargetStock(symbols[0]);
        setFeatureStocks([symbols[1]]);
      } else if (symbols.length === 1) {
        setSelectedStocks([symbols[0]]);
        setTargetStock(symbols[0]);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 타겟 주식 선택 핸들러
  const handleTargetChange = (target: string) => {
    setTargetStock(target);
    // 타겟이 피처에 있었다면 피처에서 제거
    if (featureStocks.includes(target)) {
      setFeatureStocks(featureStocks.filter(s => s !== target));
    }
    setShowAnalysis(false);
    setCorrelationResults([]);
  };

  // 피처 주식 선택 핸들러
  const handleFeatureChange = (features: string[]) => {
    // 타겟 주식을 피처에서 제외
    const validFeatures = features.filter(f => f !== targetStock);
    setFeatureStocks(validFeatures);
    setShowAnalysis(false);
    setCorrelationResults([]);
  };

  // 분석 시작 핸들러
  const handleAnalyze = () => {
    // 모든 주식 상관관계 계산
    const results: CorrelationResult[] = [];
    const baseStock = stocks.find(s => s.symbol === targetStock);
    
    if (baseStock && featureStocks.length > 0) {
      featureStocks.forEach(featureSymbol => {
        const compareStock = stocks.find(s => s.symbol === featureSymbol);
        if (compareStock) {
          // 두 주식의 가격 데이터 준비
          const baseDates = baseStock.data.map(d => d.date);
          const compareDates = compareStock.data.map(d => d.date);
          
          // 공통 날짜 찾기
          const commonDates = baseDates.filter(date => compareDates.includes(date));
          const baseValues = commonDates.map(date => {
            const data = baseStock.data.find(d => d.date === date);
            return data ? data.close : 0;
          });
          const compareValues = commonDates.map(date => {
            const data = compareStock.data.find(d => d.date === date);
            return data ? data.close : 0;
          });

          // 상관계수 계산
          const correlation = calculateCorrelation(baseValues, compareValues);
          results.push({
            stock1: baseStock.symbol,
            stock2: compareStock.symbol,
            correlation: correlation,
            dates: commonDates,
            values1: baseValues,
            values2: compareValues
          });
        }
      });
    }

    setCorrelationResults(results);
    setShowAnalysis(true);
  };

  // 상관계수 계산 함수
  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b) / n;
    const meanY = y.reduce((a, b) => a + b) / n;
    
    const diffX = x.map(v => v - meanX);
    const diffY = y.map(v => v - meanY);
    
    const sumXY = diffX.reduce((a, v, i) => a + v * diffY[i], 0);
    const sumX2 = diffX.reduce((a, v) => a + v * v, 0);
    const sumY2 = diffY.reduce((a, v) => a + v * v, 0);
    
    return sumXY / Math.sqrt(sumX2 * sumY2);
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
          targetStock={targetStock}
          featureStocks={featureStocks}
          onTargetChange={handleTargetChange}
          onFeatureChange={handleFeatureChange}
          onChange={(selected) => {
            setSelectedStocks(selected);
            if (selected.length > 0) {
              setTargetStock(selected[0]);
            }
          }}
          multiple={true}
        />

        {targetStock && featureStocks.length > 0 && (
          <div className="mt-4">
            <button
              onClick={handleAnalyze}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              분석하기
            </button>
          </div>
        )}
      </div>

      {showAnalysis && targetStock && featureStocks.length > 0 ? (
        <div className="card space-y-6">
          <h2 className="section-title">분석 결과</h2>
          <div className="grid gap-6">
            {correlationResults.map((result, index) => {
              const strength = getCorrelationStrength(result.correlation);
              const correlation = result.correlation;
              const isSignificant = Math.abs(correlation) >= 0.4;
              
              return (
                <div key={index} className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">
                    {result.stock1} 와 {result.stock2} 의 상관관계
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">상관계수:</span>
                      <span className="font-medium">{correlation.toFixed(3)}</span>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${strength.color.replace('text-', 'bg-').replace('600', '100')}`}>
                        {strength.level}
                      </span>
                    </div>
                    
                    <div className="bg-white p-4 rounded border border-gray-100">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-1">상관관계 해석:</h4>
                          <p className="text-gray-800">{strength.description}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-1">투자 시사점:</h4>
                          <p className="text-gray-700">
                            {isSignificant ? 
                              correlation > 0 ?
                                '두 주식이 비슷한 방향으로 움직이기 때문에, 위험 분산을 위해서는 다른 유형의 자산을 함께 고려하는 것이 좋습니다.' :
                                '두 주식이 반대 방향으로 움직이기 때문에, 포트폴리오 다각화에 유용할 수 있습니다.' :
                              '두 주식 사이에 뚜렷한 상관관계가 없어, 독립적인 가격 변동을 보이고 있습니다.'
                            }
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-1">데이터 기간:</h4>
                          <p className="text-sm text-gray-600">
                            {result.dates.length}일간의 거래일 기준 분석 결과입니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <CorrelationAnalysis
            stocks={stocks}
            selectedStocks={[targetStock, ...featureStocks]}
          />
        </div>
      ) : (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="text-yellow-700">
            <h2 className="section-title text-yellow-800">주의</h2>
            <p>상관관계 분석을 위해 기준 지표와 최소 1개 이상의 재료 지표를 선택한 후 분석하기 버튼을 눌러주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
