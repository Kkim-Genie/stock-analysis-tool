import React, { useState, useCallback } from "react";
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

interface DifferencingData {
  date: string;
  original: number;
  diff1?: number;
  diff2?: number;
  diff3?: number;
}

interface ARIMAAnalysisProps {
  stocks: Stock[];
  selectedStock: string;
  params: ARIMAParams;
}

// 차분 데이터 계산 함수
const calculateDifferences = (dates: string[], values: number[]): DifferencingData[] => {
  const result: DifferencingData[] = [];
  
  for (let i = 0; i < values.length; i++) {
    const data: DifferencingData = {
      date: dates[i],
      original: values[i],
    };

    // 1차 차분
    if (i > 0) {
      data.diff1 = values[i] - values[i - 1];
    }

    // 2차 차분
    if (i > 1) {
      data.diff2 = (values[i] - values[i - 1]) - (values[i - 1] - values[i - 2]);
    }

    // 3차 차분
    if (i > 2) {
      const diff1 = values[i] - values[i - 1];
      const diff2 = values[i - 1] - values[i - 2];
      const diff3 = values[i - 2] - values[i - 3];
      data.diff3 = (diff1 - diff2) - (diff2 - diff3);
    }

    result.push(data);
  }

  return result;
};

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

const DifferencingCharts: React.FC<{ data: DifferencingData[] }> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* 원본 데이터 그래프 */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">원본 데이터</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="original"
              stroke="#8884d8"
              name="원본"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 1차 차분 그래프 */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">1차 차분</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="diff1"
              stroke="#82ca9d"
              name="1차 차분"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 2차 차분 그래프 */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">2차 차분</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="diff2"
              stroke="#ffc658"
              name="2차 차분"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 3차 차분 그래프 */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4">3차 차분</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="diff3"
              stroke="#ff7300"
              name="3차 차분"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 차분 선택 가이드라인 */}
      <div className="col-span-1 lg:col-span-2 card p-6">
        <h3 className="text-lg font-semibold mb-4">차분 차수 선택 가이드라인</h3>
        <div className="space-y-4 text-gray-700">
          <p>차분은 시계열 데이터를 정상성(stationary)으로 만들기 위해 사용됩니다. 적절한 차분 차수를 선택하는 것이 중요합니다.</p>
          
          <div className="pl-4 border-l-4 border-blue-500">
            <h4 className="font-semibold mb-2">차분 차수 선택 기준:</h4>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>0차 (원본 데이터)</strong>: 데이터가 이미 정상성을 보이며 불규칙하게 변동하지 않는 경우</li>
              <li><strong>1차 차분</strong>: 대부분의 금융 시계열에 적합. 선형 트렌드 제거</li>
              <li><strong>2차 차분</strong>: 비선형 트렌드가 있는 경우. 대부분의 경우 불필요</li>
              <li><strong>3차 차분</strong>: 매우 드물게 사용. 대부분의 경우 과도한 차분</li>
            </ul>
          </div>

          <div className="mt-4">
            <p className="font-semibold">추천 방법:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>원본 데이터의 트렌드와 변동성을 관찰합니다.</li>
              <li>1차 차분부터 시작하여 그래프를 확인합니다.</li>
              <li>그래프가 안정적인 평균과 분산을 보이며 불규칙한 변동이 없는 차수를 선택합니다.</li>
              <li>대부분의 경우 1차 차분으로 충분합니다.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [differencingData, setDifferencingData] = useState<DifferencingData[]>([]);

  // 차분 데이터 계산
  const calculateDifferencingData = useCallback(() => {
    const stockData = stocks.find((s) => s.symbol === selectedStock);
    if (!stockData) return;

    const dates = stockData.data.map(d => d.date);
    const values = stockData.data.map(d => d.close);
    const differences = calculateDifferences(dates, values);
    setDifferencingData(differences);
  }, [stocks, selectedStock]);

  // 주식 데이터가 변경되면 차분 데이터 재계산
  React.useEffect(() => {
    calculateDifferencingData();
  }, [selectedStock, stocks, calculateDifferencingData]);

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
      {/* 차분 그래프 */}
      {differencingData.length > 0 && (
        <DifferencingCharts data={differencingData} />
      )}

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
