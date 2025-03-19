"use client";

import { Stock } from "@/lib/types";

interface StockSelectorProps {
  stocks: Stock[];
  selectedStocks: string[];
  onChange: (stocks: string[]) => void;
  multiple?: boolean;
}

const StockSelector: React.FC<StockSelectorProps> = ({
  stocks,
  selectedStocks,
  onChange,
  multiple = false,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const options = event.target.options;
      const selectedOptions: string[] = [];

      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selectedOptions.push(options[i].value);
        }
      }

      onChange(selectedOptions);
    } else {
      onChange([event.target.value]);
    }
  };

  return (
    <div className="mb-4">
      <label className="block mb-2 text-sm font-medium text-gray-700">
        {multiple ? "분석할 주식 선택 (여러 개 선택 가능)" : "분석할 주식 선택"}
      </label>
      <select
        className="w-full p-2.5 bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        multiple={multiple}
        value={selectedStocks}
        onChange={handleChange}
        size={multiple ? Math.min(5, stocks.length) : 1}
      >
        {stocks.map((stock) => (
          <option key={stock.symbol} value={stock.symbol}>
            {stock.symbol} - {stock.name}
          </option>
        ))}
      </select>
      {multiple && (
        <p className="mt-1 text-sm text-gray-500">
          Ctrl 키(Mac에서는 Command 키)를 누른 상태에서 클릭하여 여러 항목을
          선택할 수 있습니다.
        </p>
      )}
    </div>
  );
};

export default StockSelector;
