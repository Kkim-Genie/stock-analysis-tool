import React, { useState } from "react";
import * as tf from "@tensorflow/tfjs";
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
import { Stock, ARIMAParams, AnalysisResult } from "../../lib/types";
import {
  prepareARIMAData,
  createLaggedDataset,
  normalizeData,
  denormalizeData,
} from "../../lib/utils";

interface ARIMAAnalysisProps {
  stocks: Stock[];
  selectedStock: string;
  params: ARIMAParams;
}

// 미래 날짜 생성 함수
const generateFutureDates = (startDate: string, days: number): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate);

  for (let i = 1; i <= days; i++) {
    const nextDate = new Date(start);
    nextDate.setDate(nextDate.getDate() + i);
    dates.push(nextDate.toISOString().split("T")[0]);
  }

  return dates;
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

  // 예측 데이터 포맷팅 (미래 날짜에만)
  for (let i = 0; i < predictions.length; i++) {
    results.push({
      date: futureDates[i],
      value: null as unknown as number, // 실제 값은 없음
      prediction: predictions[i],
    });
  }

  return results;
};

const ARIMAAnalysis: React.FC<ARIMAAnalysisProps> = ({
  stocks,
  selectedStock,
  params,
}) => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisStarted, setIsAnalysisStarted] = useState<boolean>(false);

  // ARIMA 분석 시작 핸들러
  const handleStartAnalysis = async () => {
    if (!selectedStock) {
      setError("분석할 주식을 선택해주세요");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsAnalysisStarted(true);

      // 선택된 주식 데이터 찾기
      const stock = stocks.find((s) => s.symbol === selectedStock);
      if (!stock) {
        throw new Error(`주식 ${selectedStock}을(를) 찾을 수 없습니다`);
      }

      // d 매개변수에 따라 차분 적용
      const diffData = prepareARIMAData(stock.data, params.d);

      // 원본 데이터 날짜와 값
      const originalDates = stock.data.map((d) => d.date);
      const originalValues = stock.data.map((d) => d.close);

      // 차분된 데이터 정규화
      const [normalizedData, min, max] = normalizeData(diffData);
      const diffArray = Array.from(normalizedData.dataSync());

      // ARIMA 모델 학습
      const predictions = await trainARIMAModel(
        diffArray,
        params.p,
        params.q,
        params.forecastSteps
      );

      // 예측값 역정규화
      const denormalizedPredictions = denormalizeData(predictions, min, max);

      // d > 0인 경우 차분을 원래대로 되돌리기 (누적합)
      let actualPredictions: number[] = [];
      if (params.d > 0) {
        let lastActual = stock.data[stock.data.length - 1].close;
        actualPredictions = denormalizedPredictions.map((diff) => {
          const prediction = lastActual + diff;
          lastActual = prediction;
          return prediction;
        });
      } else {
        actualPredictions = denormalizedPredictions;
      }

      // 미래 날짜 생성
      const lastDate = stock.data[stock.data.length - 1].date;
      const futureDates = generateFutureDates(lastDate, params.forecastSteps);

      // 결과 포맷팅
      const formattedResults = formatAnalysisResults(
        originalDates,
        originalValues,
        futureDates,
        actualPredictions
      );

      setResults(formattedResults);
    } catch (err) {
      setError(
        `ARIMA 분석 실패: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ARIMA 모델 구현 (TensorFlow.js 사용)
  const trainARIMAModel = async (
    diffData: number[],
    p: number, // AR 차수
    q: number, // MA 차수
    forecastSteps: number
  ): Promise<number[]> => {
    // AR 컴포넌트를 위해 과거 'p' 관측치 사용
    const lag = Math.max(p, q);

    if (diffData.length <= lag) {
      throw new Error(`ARIMA 모델에 필요한 데이터가 부족합니다 (lag: ${lag})`);
    }

    // 시차 데이터셋 생성
    const [X, y] = createLaggedDataset(diffData, lag);

    // 모델 생성 및 학습
    const model = tf.sequential();

    // 간소화된 모델 구조 (성능 향상을 위해)
    model.add(
      tf.layers.dense({
        units: 20,
        activation: "relu",
        inputShape: [lag],
      })
    );

    model.add(
      tf.layers.dense({
        units: 1,
      })
    );

    model.compile({
      optimizer: tf.train.adam(),
      loss: "meanSquaredError",
    });

    await model.fit(X, y, {
      epochs: 50,
      batchSize: 32,
      verbose: 0,
    });

    // 예측 생성
    const predictions: number[] = [];

    // 마지막 'lag' 관측치로 시작
    const lastObservations = diffData.slice(-lag);

    // 재귀적으로 예측 생성
    for (let i = 0; i < forecastSteps; i++) {
      const input = tf.tensor2d([lastObservations], [1, lag]);
      const prediction = model.predict(input) as tf.Tensor;
      const value = prediction.dataSync()[0];

      predictions.push(value);

      // 다음 예측을 위한 관측치 업데이트
      lastObservations.shift();
      lastObservations.push(value);

      // 텐서 메모리 정리
      input.dispose();
      prediction.dispose();
    }

    // 메모리 정리
    X.dispose();
    y.dispose();
    model.dispose();

    return predictions;
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
        <p>ARIMA 분석을 실행 중입니다. 잠시만 기다려주세요...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isAnalysisStarted ? (
        <div className="text-center py-6">
          <button
            onClick={handleStartAnalysis}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            ARIMA 분석 시작하기
          </button>
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
                <h2 className="text-xl font-semibold">ARIMA 분석 결과</h2>
                <button
                  onClick={handleStartAnalysis}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  분석 다시 실행
                </button>
              </div>

              <div className="border rounded-lg p-4 bg-white">
                <h3 className="text-lg font-medium mb-3">
                  {selectedStock} - ARIMA({params.p},{params.d},{params.q})
                </h3>

                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={results}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      interval={Math.floor(results.length / 10)}
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
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ARIMAAnalysis;
