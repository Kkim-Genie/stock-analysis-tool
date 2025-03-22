import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Stock, VARParams, AnalysisResult, StockData } from "../../lib/types";

// Chi-square test implementation
function calculateChiSquare(observed: number[][], expected: number[][]): number {
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    for (let j = 0; j < observed[i].length; j++) {
      if (expected[i][j] !== 0) {
        chiSquare += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
      }
    }
  }
  return chiSquare;
}

// Calculate p-value from chi-square statistic and degrees of freedom
function calculatePValue(chiSquare: number, df: number): number {
  // Using gamma function approximation for chi-square distribution
  function gammaCDF(x: number, a: number): number {
    if (x <= 0) return 0;
    
    // Approximation of incomplete gamma function
    let sum = 0;
    let term = 1 / a;
    for (let i = 0; i < 100; i++) {
      sum += term;
      term *= x / (a + i);
    }
    
    return 1 - Math.exp(-x) * Math.pow(x, a) * sum;
  }
  
  return 1 - gammaCDF(chiSquare / 2, df / 2);
}

// Create contingency table for two time series
function createContingencyTable(series1: number[], series2: number[]): number[][] {
  if (series1.length !== series2.length) throw new Error('Series must be of equal length');
  
  // Categorize changes as -1 (decrease), 0 (no change), 1 (increase)
  const categorize = (curr: number, prev: number) => {
    if (curr > prev) return 2;
    if (curr < prev) return 0;
    return 1;
  };
  
  // Initialize 3x3 contingency table
  const table = Array(3).fill(0).map(() => Array(3).fill(0));
  
  // Fill contingency table
  for (let i = 1; i < series1.length; i++) {
    const cat1 = categorize(series1[i], series1[i-1]);
    const cat2 = categorize(series2[i], series2[i-1]);
    table[cat1][cat2]++;
  }
  
  return table;
}

// Calculate expected frequencies
function calculateExpectedFrequencies(observed: number[][]): number[][] {
  const rowSums = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colSums = observed[0].map((_, i) => observed.reduce((sum, row) => sum + row[i], 0));
  const total = rowSums.reduce((a, b) => a + b, 0);
  
  return observed.map((row, i) => 
    row.map((_, j) => (rowSums[i] * colSums[j]) / total)
  );
}

// Analyze relationship between two time series
function analyzeRelationship(series1: number[], series2: number[]): {
  chiSquare: number;
  pValue: number;
  hasRelationship: boolean;
} {
  const contingencyTable = createContingencyTable(series1, series2);
  const expectedFrequencies = calculateExpectedFrequencies(contingencyTable);
  const chiSquare = calculateChiSquare(contingencyTable, expectedFrequencies);
  const df = (contingencyTable.length - 1) * (contingencyTable[0].length - 1);
  const pValue = calculatePValue(chiSquare, df);
  const hasRelationship = pValue < 0.05; // Using 5% significance level
  
  return { chiSquare, pValue, hasRelationship };
}

interface VARAnalysisProps {
  stocks: Stock[];
  targetStock: string;
  featureStocks: string[];
  params: VARParams;
}

// 거래일 패턴을 유지하며 미래 날짜 생성
const generateFutureTradingDates = (
  dates: string[], // 기존 거래일 날짜 배열
  steps: number // 생성할 미래 날짜 수
): string[] => {
  if (dates.length < 2) {
    return [];
  }

  const futureDates: string[] = [];

  // 거래일 패턴 분석을 위해 최근 날짜들의 간격 계산
  const recentDates = dates.slice(-Math.min(20, dates.length));
  const intervals: number[] = [];

  for (let i = 1; i < recentDates.length; i++) {
    const prev = new Date(recentDates[i - 1]);
    const curr = new Date(recentDates[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    intervals.push(diffDays);
  }

  // 평균 거래일 간격 계산 (가장 일반적인 간격 사용)
  const frequencyMap: { [key: number]: number } = {};
  let maxFrequency = 0;
  let commonInterval = 1;

  intervals.forEach((interval) => {
    frequencyMap[interval] = (frequencyMap[interval] || 0) + 1;
    if (frequencyMap[interval] > maxFrequency) {
      maxFrequency = frequencyMap[interval];
      commonInterval = interval;
    }
  });

  // 주말/공휴일 패턴 감지 (요일 기반)
  const tradingDays = new Set<number>();
  recentDates.forEach((dateStr) => {
    const date = new Date(dateStr);
    tradingDays.add(date.getDay()); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  });

  // 마지막 날짜부터 시작해서 미래 날짜 생성
  const lastDate = new Date(dates[dates.length - 1]);
  const currentDate = new Date(lastDate);

  while (futureDates.length < steps) {
    // 다음 날짜로 이동
    currentDate.setDate(currentDate.getDate() + commonInterval);

    // 주말/공휴일 패턴을 따름
    if (tradingDays.has(currentDate.getDay())) {
      const dateStr = currentDate.toISOString().split("T")[0];
      futureDates.push(dateStr);
    }
  }

  return futureDates;
};

// 분석 결과 포맷팅 함수
const formatAnalysisResults = (
  dates: string[],
  values: number[],
  futureDates: string[],
  predictions: number[]
): AnalysisResult[] => {
  const results: AnalysisResult[] = [];

  // 실제 데이터 포맷팅
  for (let i = 0; i < values.length; i++) {
    results.push({
      date: dates[i],
      value: values[i],
    });
  }

  // 마지막 실제 데이터 포인트를 예측의 시작점으로 사용
  const lastActualValue = values[values.length - 1];

  // 예측 데이터 포맷팅
  for (let i = 0; i < predictions.length; i++) {
    // 첫 번째 예측 값은 마지막 실제 값으로 설정하여 연속성 유지
    const predValue = i === 0 ? lastActualValue : predictions[i - 1];

    results.push({
      date: futureDates[i],
      value: null as unknown as number,
      prediction: predValue,
    });
  }

  return results;
};

const VARAnalysis: React.FC<VARAnalysisProps> = ({
  stocks,
  targetStock,
  featureStocks,
  params,
}) => {
  const [results, setResults] = useState<AnalysisResult[][]>([]);
  const [normalizedResults, setNormalizedResults] = useState<AnalysisResult[][]>([]);

  // 주어진 시계열의 마지막 값을 1로 하는 정규화
  const normalizeToLastValue = (data: number[]): number[] => {
    const lastValue = data[data.length - 1];
    return data.map(value => value / lastValue);
  };
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisStarted, setIsAnalysisStarted] = useState<boolean>(false);

  // 기준 지표와 재료 지표 선택 상태 추가
  const [cointegrationResults, setCointegrationResults] = useState<{
    [key: string]: { statistic: number; pValue: number; isCointegrated: boolean };
  }>({});

  const [chiSquareResults, setChiSquareResults] = useState<{
    [key: string]: { statistic: number; pValue: number; hasRelationship: boolean };
  }>({});

  // 분석 시작 상태 초기화
  useEffect(() => {
    setIsAnalysisStarted(false);
    setChiSquareResults({});
    setCointegrationResults({});
  }, [targetStock, featureStocks]);

  // 공적분 검정 수행 함수
  const performCointegrationTest = (
    targetData: number[],
    featureData: number[]
  ): { isCointegrated: boolean; statistic: number; pValue: number } => {
    // 1. 두 시계열의 차분 계산
    const diffTarget = targetData.slice(1).map((val, i) => val - targetData[i]);
    const diffFeature = featureData.slice(1).map((val, i) => val - featureData[i]);

    // 2. 잔차 계산
    const residuals = targetData.map((val, i) => val - (featureData[i] * (diffTarget.reduce((a, b) => a + b, 0) / diffFeature.reduce((a, b) => a + b, 0))));

    // 3. ADF 테스트 수행 (단순화된 버전)
    const n = residuals.length;
    const laggedResiduals = residuals.slice(0, -1);
    const deltaResiduals = residuals.slice(1).map((val, i) => val - residuals[i]);

    // 회귀 계수 계산
    const sumXY = laggedResiduals.reduce((sum, x, i) => sum + x * deltaResiduals[i], 0);
    const sumX2 = laggedResiduals.reduce((sum, x) => sum + x * x, 0);
    const beta = sumXY / sumX2;

    // t-통계량 계산
    const se = Math.sqrt(
      deltaResiduals.reduce((sum, y, i) => sum + Math.pow(y - beta * laggedResiduals[i], 2), 0) /
      (n - 2)
    );
    const statistic = Math.abs(beta / (se / Math.sqrt(sumX2)));

    // p-value 계산 (단순화된 버전)
    const pValue = Math.exp(-0.5 * statistic);

    return {
      isCointegrated: pValue < 0.05,
      statistic,
      pValue
    };
  };

  // 카이제곱 분석 수행 함수
  const performChiSquareAnalysis = (
    targetData: number[],
    featureData: number[]
  ) => {
    if (targetData.length !== featureData.length || targetData.length < 2) {
      throw new Error('데이터 길이가 맞지 않거나 충분하지 않습니다.');
    }

    // 일별 변화율 계산
    const targetChanges = targetData.slice(1).map((val, i) => val - targetData[i]);
    const featureChanges = featureData.slice(1).map((val, i) => val - featureData[i]);

    // 카이제곱 분석 수행
    const result = analyzeRelationship(targetChanges, featureChanges);

    return {
      statistic: result.chiSquare,
      pValue: result.pValue,
      hasRelationship: result.hasRelationship
    };
  };



  // ADF 테스트를 간략화한 버전 - 시계열이 정상성을 가지는지 확인
  const needsDifferencing = (data: number[]): boolean => {
    // 간단한 추세 검사로 정상성 확인
    const n = data.length;
    if (n < 10) return false;

    // 선형 회귀 계수 계산 (시간에 따른 추세)
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    // 추세의 강도 측정
    const trendStrength = Math.abs((slope * n) / avgY);

    // 추세가 강하면 차분 필요
    return trendStrength > 0.1;
  };

  // 차분 적용
  const applyDifferencing = (data: number[]): number[] => {
    const diffed = [];
    for (let i = 1; i < data.length; i++) {
      diffed.push(data[i] - data[i - 1]);
    }
    return diffed;
  };

  // 간소화된 VAR 모델 로직
  const simpleVarForecast = (
    data: number[][],
    targetIndex: number,
    lag: number,
    steps: number
  ): number[] => {
    const numStocks = data.length;
    const stockLength = data[0].length;

    // 예측은 타겟 지표에 대해서만 수행
    const predictions: number[] = [];

    // AR 계수 계산 (간소화된 방식)
    const coefficients: number[][] = [];

    // 타겟 지표에 대한 계수만 계산
    for (let l = 0; l < lag; l++) {
      coefficients[l] = Array(numStocks).fill(0);

      // 단순화된 AR 계수 계산 (평균 변화율)
      for (let j = 0; j < numStocks; j++) {
        let sum = 0;
        let count = 0;

        for (let t = lag; t < stockLength; t++) {
          // t 시점 값과 t-l-1 시점 값의 관계
          sum +=
            (data[targetIndex][t] - data[targetIndex][t - 1]) *
            (data[j][t - l - 1] - data[j][t - l - 2] || 0);
          count++;
        }

        // 각 주식/시차의 영향력 계산
        coefficients[l][j] = count > 0 ? sum / count : 0;
      }

      // 계수 스케일 조정
      const scale = coefficients[l].reduce((a, b) => a + Math.abs(b), 0);
      if (scale > 0) {
        for (let j = 0; j < numStocks; j++) {
          coefficients[l][j] = (coefficients[l][j] / scale) * 0.5; // 안정성을 위해 계수 축소
        }
      }
    }

    // 예측 시작점 - 마지막 알려진 값들
    const latestValues: number[][] = [];
    for (let i = 0; i < lag + 1; i++) {
      const values: number[] = [];
      for (let s = 0; s < numStocks; s++) {
        values.push(data[s][stockLength - 1 - i]);
      }
      latestValues.push(values);
    }

    // 예측 실행 - 타겟 지표에 대해서만
    for (let step = 0; step < steps; step++) {
      // 기본값은 마지막 값 (변화 없음 가정)
      let nextValue = latestValues[0][targetIndex];
      let change = 0;

      // 각 lag와 주식의 영향 계산
      for (let l = 0; l < lag; l++) {
        if (l + 1 >= latestValues.length) continue;

        for (let j = 0; j < numStocks; j++) {
          // 이전 변화에 계수 적용
          const prevChange = latestValues[l][j] - latestValues[l + 1][j];
          change += prevChange * coefficients[l][j];
        }
      }

      // 마지막 값에 예측된 변화 적용
      nextValue = latestValues[0][targetIndex] + change;
      predictions.push(nextValue);

      // 다음 예측을 위해 모든 지표의 값 업데이트
      const nextValues: number[] = Array(numStocks).fill(0);

      // 타겟 지표는 방금 예측한 값을 사용
      nextValues[targetIndex] = nextValue;

      // 다른 지표들은 간단한 추세 연장으로 추정 (실제 사용되는 건 타겟 지표만)
      for (let s = 0; s < numStocks; s++) {
        if (s !== targetIndex) {
          // 이전 변화를 그대로 적용 (선형 추세 가정)
          const prevChange = latestValues[0][s] - latestValues[1][s];
          nextValues[s] = latestValues[0][s] + prevChange;
        }
      }

      // 다음 예측을 위해 값 갱신
      latestValues.unshift(nextValues);
      if (latestValues.length > lag + 1) {
        latestValues.pop();
      }
    }

    return predictions;
  };

  // 분석 시작 버튼 클릭 핸들러
  const handleStartAnalysis = async () => {
    if (!targetStock) {
      setError("기준 지표를 선택해주세요");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsAnalysisStarted(true);

      // 모든 분석 대상 지표 (기준 + 재료)
      const allAnalysisStocks = [targetStock, ...featureStocks];

      // 선택된 주식 데이터 수집
      const selectedStocksData = allAnalysisStocks.map((symbol) => {
        const stock = stocks.find((s) => s.symbol === symbol);
        if (!stock) throw new Error(`주식 ${symbol}을(를) 찾을 수 없습니다`);
        return stock;
      });

      // 각 주식의 종가 데이터 추출 (최대 100개 데이터 포인트만 사용)
      const stockPrices = selectedStocksData.map((stock) => {
        const prices = stock.data.slice(-100).map((d) => d.close);
        return prices;
      });

      // 원본 가격 데이터 저장
      const originalPrices = [...stockPrices];

      // 데이터 정규화
      const normalizedPrices = stockPrices.map(prices => normalizeToLastValue(prices));

      // 정상성 확인 및 차분 적용
      const differenced: boolean[] = [];
      const processedData: number[][] = [];
      const processedNormalizedData: number[][] = [];

      for (let i = 0; i < stockPrices.length; i++) {
        let processed = [...stockPrices[i]];
        let processedNormalized = [...normalizedPrices[i]];
        const needsDiff = needsDifferencing(processed);
        differenced.push(needsDiff);

        if (needsDiff) {
          processed = applyDifferencing(processed);
          processedNormalized = applyDifferencing(processedNormalized);
        }

        processedData.push(processed);
        processedNormalizedData.push(processedNormalized);
      }

      // 원본 데이터와 정규화된 데이터로 각각 예측 실행
      const targetIndex = 0; // 기준 지표는 항상 첫 번째 위치에 있음
      
      // 원본 데이터 예측
      const predictions = simpleVarForecast(
        processedData,
        targetIndex,
        Math.min(params.lag, 5), // 안정성을 위해 lag 제한
        params.forecastSteps
      );

      // 정규화된 데이터 예측
      const normalizedPredictions = simpleVarForecast(
        processedNormalizedData,
        targetIndex,
        Math.min(params.lag, 5),
        params.forecastSteps
      );

      // 차분을 적용한 경우 누적합 계산하여 원래 스케일로 변환
      let finalPredictions = [...predictions];
      let finalNormalizedPredictions = [...normalizedPredictions];

      if (differenced[targetIndex]) {
        // 원본 데이터 누적합
        const lastActualValue = originalPrices[targetIndex][originalPrices[targetIndex].length - 1];
        const cumulative = [lastActualValue];
        for (const diff of predictions) {
          cumulative.push(cumulative[cumulative.length - 1] + diff);
        }
        finalPredictions = cumulative.slice(1);

        // 정규화된 데이터 누적합
        const lastNormalizedValue = normalizedPrices[targetIndex][normalizedPrices[targetIndex].length - 1];
        const normalizedCumulative = [lastNormalizedValue];
        for (const diff of normalizedPredictions) {
          normalizedCumulative.push(normalizedCumulative[normalizedCumulative.length - 1] + diff);
        }
        finalNormalizedPredictions = normalizedCumulative.slice(1);
      }

      // 결과 포맷팅을 위한 날짜 추출
      const originalDates = selectedStocksData[targetIndex].data.map(
        (d) => d.date
      );

      // 거래일 패턴을 유지하는 미래 날짜 생성
      const futureDates = generateFutureTradingDates(
        originalDates,
        params.forecastSteps + 1 // +1은 첫 번째 예측값을 마지막 실제값과 동일하게 하기 위함
      );

      // 기준 지표에 대한 분석 결과 생성
      const originalAnalysisResult = formatAnalysisResults(
        originalDates,
        originalPrices[targetIndex],
        futureDates,
        finalPredictions
      );

      const normalizedAnalysisResult = formatAnalysisResults(
        originalDates,
        normalizedPrices[targetIndex],
        futureDates,
        finalNormalizedPredictions
      );

      // 결과 설정
      setResults([originalAnalysisResult]);
      setNormalizedResults([normalizedAnalysisResult]);
    } catch (err) {
      setError(
        `VAR 분석 실패: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsLoading(false);
    }
  };



  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
        <p>VAR 분석을 실행 중입니다. 잠시만 기다려주세요...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Granger 인과검정 섹션 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-medium mb-3">Granger 인과검정</h3>
        <div className="text-sm text-gray-600 mb-4">
          재료 지표들이 기준 지표의 변화를 예측하는 데 도움이 되는지 분석합니다.
          유의수준 0.05로 검정하여, 인과관계의 존재 여부를 확인합니다.
        </div>
        
        <div className="text-center">
          <button
            onClick={() => {
              if (targetStock && featureStocks.length > 0) {
                const targetStockData = stocks.find((s) => s.symbol === targetStock);
                const newChiSquareResults: {
                  [key: string]: { statistic: number; pValue: number; hasRelationship: boolean };
                } = {};

                if (targetStockData) {
                  featureStocks.forEach((featureSymbol) => {
                    const featureStockData = stocks.find(
                      (s) => s.symbol === featureSymbol
                    );
                    if (featureStockData) {
                      try {
                        const result = performChiSquareAnalysis(
                          targetStockData.data.map((p: StockData) => p.close),
                          featureStockData.data.map((p: StockData) => p.close)
                        );
                        newChiSquareResults[featureSymbol] = result;
                      } catch (error) {
                        console.error(`Granger 검정 중 오류 발생 (${featureSymbol}):`, error);
                      }
                    }
                  });
                }
                setChiSquareResults(newChiSquareResults);
              }
            }}
            disabled={!targetStock || featureStocks.length === 0}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              targetStock && featureStocks.length > 0
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Granger 검정 실행
          </button>
        </div>

        {Object.keys(chiSquareResults).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {Object.entries(chiSquareResults).map(([symbol, result]) => {
              const stock = stocks.find(s => s.symbol === symbol);
              return (
                <div key={symbol} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-lg mb-2">{stock?.name} ({symbol})</h4>
                  <div className="space-y-2">
                    <p className="text-sm">F-통계량: {result.statistic.toFixed(4)}</p>
                    <p className="text-sm">p-value: {result.pValue.toFixed(4)}</p>
                    <p className={`text-sm font-medium ${result.hasRelationship ? 'text-blue-600' : 'text-gray-600'}`}>
                      {result.hasRelationship 
                        ? '✓ 유의미한 인과관계가 있습니다 (p < 0.05)'
                        : '✗ 유의미한 인과관계가 없습니다 (p ≥ 0.05)'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 공적분 검정 섹션 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-medium mb-3">공적분 검정</h3>
        <div className="text-sm text-gray-600 mb-4">
          기준 지표와 재료 지표들 간의 장기적 규형성을 검정합니다.
          공적분이 존재하면 두 시계열이 장기적으로 유사한 패턴을 보입니다.
        </div>

        <div className="text-center">
          <button
            onClick={() => {
              if (targetStock && featureStocks.length > 0) {
                const targetStockData = stocks.find((s) => s.symbol === targetStock);
                const newCointegrationResults: {
                  [key: string]: { statistic: number; pValue: number; isCointegrated: boolean };
                } = {};

                if (targetStockData) {
                  featureStocks.forEach((featureSymbol) => {
                    const featureStockData = stocks.find(
                      (s) => s.symbol === featureSymbol
                    );
                    if (featureStockData) {
                      try {
                        const result = performCointegrationTest(
                          targetStockData.data.map((p: StockData) => p.close),
                          featureStockData.data.map((p: StockData) => p.close)
                        );
                        newCointegrationResults[featureSymbol] = result;
                      } catch (error) {
                        console.error(`공적분 검정 중 오류 발생 (${featureSymbol}):`, error);
                      }
                    }
                  });
                }
                setCointegrationResults(newCointegrationResults);
              }
            }}
            disabled={!targetStock || featureStocks.length === 0}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              targetStock && featureStocks.length > 0
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            공적분 검정 실행
          </button>
        </div>

        {Object.keys(cointegrationResults).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {Object.entries(cointegrationResults).map(([symbol, result]) => {
              const stock = stocks.find(s => s.symbol === symbol);
              return (
                <div key={symbol} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-lg mb-2">{stock?.name} ({symbol})</h4>
                  <div className="space-y-2">
                    <p className="text-sm">ADF 통계량: {result.statistic.toFixed(4)}</p>
                    <p className="text-sm">p-value: {result.pValue.toFixed(4)}</p>
                    <p className={`text-sm font-medium ${result.isCointegrated ? 'text-blue-600' : 'text-gray-600'}`}>
                      {result.isCointegrated 
                        ? '✓ 공적분 관계가 있습니다 (p < 0.05)'
                        : '✗ 공적분 관계가 없습니다 (p ≥ 0.05)'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VAR 분석 섹션 */}
      {!isAnalysisStarted ? (
        <div className="text-center py-6">
          <button
            onClick={handleStartAnalysis}
            disabled={!targetStock}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              targetStock
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            VAR 분석 시작하기
          </button>
          {!targetStock && (
            <p className="mt-2 text-sm text-red-500">
              기준 지표를 선택하셔야 분석을 시작할 수 있습니다.
            </p>
          )}
        </div>
      ) : (
        <>
          {error ? (
            <div className="text-red-500 py-4 text-center">
              <p className="font-medium">오류 발생</p>
              <p>{error}</p>
              <button
                onClick={handleStartAnalysis}
                className="mt-3 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">VAR 분석 결과</h2>
                <button
                  onClick={handleStartAnalysis}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  분석 다시 실행
                </button>
              </div>
              {/* VAR 분석 결과 */}
              {results.length > 0 && (
                <div className="space-y-6">
                  {/* 원본 데이터 그래프 */}
                  <div className="border rounded-lg p-4 bg-white">
                    <h3 className="text-lg font-medium mb-3">
                      원본 데이터 분석 결과
                    </h3>

                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={results[0]}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          interval={Math.floor(results[0].length / 10)}
                        />
                        <YAxis domain={["auto", "auto"]} />
                        <Tooltip
                          formatter={(value) => {
                            if (value === null) return ["-", ""];
                            return [
                              `${parseFloat(value as string).toFixed(2)}`,
                              "가격",
                            ];
                          }}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#8884d8"
                          name="실제 가격"
                          dot={false}
                          strokeWidth={2}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="prediction"
                          stroke="#ff7300"
                          name="예측 가격"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 정규화 데이터 그래프 */}
                  <div className="border rounded-lg p-4 bg-white">
                    <h3 className="text-lg font-medium mb-3">
                      정규화 데이터 분석 결과
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      마지막 가격을 1로 정규화한 그래프입니다.
                    </p>

                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={normalizedResults[0]}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          interval={Math.floor(normalizedResults[0].length / 10)}
                        />
                        <YAxis 
                          domain={["auto", "auto"]} 
                          tickFormatter={(value) => value.toFixed(2)}
                        />
                        <Tooltip
                          formatter={(value) => {
                            if (value === null) return ["-", ""];
                            return [
                              `${parseFloat(value as string).toFixed(4)}`,
                              "상대값",
                            ];
                          }}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#8884d8"
                          name="실제 상대값"
                          dot={false}
                          strokeWidth={2}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="prediction"
                          stroke="#ff7300"
                          name="예측 상대값"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          connectNulls={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VARAnalysis;
