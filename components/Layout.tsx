import React from "react";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "chart", label: "Chart" },
    { id: "var", label: "VAR" },
    { id: "arima", label: "ARIMA" },
    { id: "garch", label: "GARCH" },
    { id: "correlation", label: "Correlation" },
    { id: "rsi", label: "RSI" },
    { id: "macd", label: "MACD" },
    { id: "custom", label: "Custom Indicator" },
  ];

  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <div className="font-bold text-xl">Stock Analysis</div>

          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === tab.id
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
