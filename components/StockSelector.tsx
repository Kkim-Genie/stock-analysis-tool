"use client";

import { Stock } from "@/lib/types";

interface StockSelectorProps {
  stocks: Stock[];
  selectedStocks: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  targetStock?: string;
  featureStocks?: string[];
  onTargetChange?: (target: string) => void;
  onFeatureChange?: (features: string[]) => void;
  hideFeatureSelection?: boolean;
}

const StockSelector: React.FC<StockSelectorProps> = ({
  stocks,
  selectedStocks,
  onChange,
  multiple = true,
  targetStock,
  featureStocks = [],
  onTargetChange,
  onFeatureChange,
  hideFeatureSelection = false,
}) => {
  if (!multiple) {
    return (
      <div className="space-y-6">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            지표 선택:
          </label>
          <select
            value={selectedStocks[0] || ""}
            onChange={(e) => onChange([e.target.value])}
            className="w-full p-2.5 bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">선택해주세요</option>
            {stocks.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - {stock.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">
          {multiple ? '기준 지표 선택:' : '지표 선택:'}
        </label>
        <select
          value={multiple ? (targetStock || "") : (selectedStocks[0] || "")}
          onChange={(e) => {
            if (multiple) {
              onTargetChange?.(e.target.value);
            } else {
              onChange([e.target.value]);
            }
          }}
          className="w-full p-2.5 bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">선택해주세요</option>
          {(multiple ? selectedStocks : stocks.map(s => s.symbol)).map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol} - {stocks.find((s) => s.symbol === symbol)?.name}
            </option>
          ))}
        </select>
      </div>

      {!hideFeatureSelection && multiple && (
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            재료 지표 선택:
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-gray-300 rounded">
            {selectedStocks
              .filter((stock) => stock !== targetStock)
              .map((symbol) => {
                const isSelected = featureStocks.includes(symbol);
                return (
                  <div key={`feature-${symbol}`} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`feature-${symbol}`}
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onFeatureChange?.([...featureStocks, symbol]);
                        } else {
                          onFeatureChange?.(featureStocks.filter(s => s !== symbol));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor={`feature-${symbol}`} className="ml-2 text-sm text-gray-700">
                      {symbol} - {stocks.find((s) => s.symbol === symbol)?.name}
                    </label>
                  </div>
                );
              })}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            여러 지표를 선택할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
};

export default StockSelector;
