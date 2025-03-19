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
import { Stock, VARParams, AnalysisResult } from "../../lib/types";

interface VARAnalysisProps {
  stocks: Stock[];
  selectedStocks: string[];
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
  selectedStocks,
  params,
}) => {
  const [results, setResults] = useState<AnalysisResult[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisStarted, setIsAnalysisStarted] = useState<boolean>(false);

  // 기준 지표와 재료 지표 선택 상태 추가
  const [targetStock, setTargetStock] = useState<string>("");
  const [featureStocks, setFeatureStocks] = useState<string[]>([]);

  // 기준 지표 변경 핸들러
  const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTarget = e.target.value;
    setTargetStock(newTarget);

    // 기준 지표가 재료 지표에 포함되어 있다면 제거
    setFeatureStocks((prev) => prev.filter((stock) => stock !== newTarget));
  };

  // 재료 지표 변경 핸들러
  const handleFeaturesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selectedOptions: string[] = [];

    for (let i = 0; i < options.length; i++) {
      if (options[i].selected && options[i].value !== targetStock) {
        selectedOptions.push(options[i].value);
      }
    }

    setFeatureStocks(selectedOptions);
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

      // 정상성 확인 및 차분 적용
      const differenced: boolean[] = [];
      const processedData: number[][] = [];

      for (let i = 0; i < stockPrices.length; i++) {
        let processed = [...stockPrices[i]];
        const needsDiff = needsDifferencing(processed);
        differenced.push(needsDiff);

        if (needsDiff) {
          processed = applyDifferencing(processed);
        }

        processedData.push(processed);
      }

      // 예측 실행 - 타겟 지표에 대해서만
      const targetIndex = 0; // 기준 지표는 항상 첫 번째 위치에 있음
      const predictions = simpleVarForecast(
        processedData,
        targetIndex,
        Math.min(params.lag, 5), // 안정성을 위해 lag 제한
        params.forecastSteps
      );

      // 차분을 적용한 경우 누적합 계산하여 원래 스케일로 변환
      let finalPredictions = [...predictions];

      if (differenced[targetIndex]) {
        // 마지막 실제 값을 시작점으로 누적합 계산
        const lastActualValue =
          originalPrices[targetIndex][originalPrices[targetIndex].length - 1];
        const cumulative = [lastActualValue];

        for (const diff of predictions) {
          cumulative.push(cumulative[cumulative.length - 1] + diff);
        }

        finalPredictions = cumulative.slice(1); // 첫 번째 값(원본 마지막 값)은 제외
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
      const analysisResult = formatAnalysisResults(
        originalDates,
        originalPrices[targetIndex],
        futureDates,
        finalPredictions
      );

      // 결과는 기준 지표에 대해서만 설정
      setResults([analysisResult]);
    } catch (err) {
      setError(
        `VAR 분석 실패: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 기본 기준 지표 설정
  useEffect(() => {
    if (selectedStocks.length > 0 && !targetStock) {
      setTargetStock(selectedStocks[0]);
      setFeatureStocks(selectedStocks.slice(1));
    }
  }, [selectedStocks, targetStock]);

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
      {/* 기준 지표 및 재료 지표 선택 UI */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-3">분석 설정</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-sm font-medium">
              기준 지표 (예측 대상):
            </label>
            <select
              value={targetStock}
              onChange={handleTargetChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">선택해주세요</option>
              {selectedStocks.map((stock) => (
                <option key={`target-${stock}`} value={stock}>
                  {stock} - {stocks.find((s) => s.symbol === stock)?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">
              재료 지표 (예측에 사용):
            </label>
            <select
              multiple
              value={featureStocks}
              onChange={handleFeaturesChange}
              className="w-full p-2 border border-gray-300 rounded h-24"
            >
              {selectedStocks
                .filter((stock) => stock !== targetStock)
                .map((stock) => (
                  <option key={`feature-${stock}`} value={stock}>
                    {stock} - {stocks.find((s) => s.symbol === stock)?.name}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Ctrl 키(Mac에서는 Command 키)를 누른 상태에서 클릭하여 여러 항목을
              선택할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

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

              {results.length > 0 && (
                <div className="border rounded-lg p-4 bg-white mb-6">
                  <h3 className="text-lg font-medium mb-3">
                    {targetStock} 예측 결과{" "}
                    {featureStocks.length > 0 &&
                      `(재료 지표: ${featureStocks.join(", ")})`}
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
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VARAnalysis;
