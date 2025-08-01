import React from "react";

const ThresholdSliderPanel = ({
  workingThreshold,
  setWorkingThreshold,
  partialThreshold,
  setPartialThreshold,
  absentThreshold,
  setAbsentThreshold,
}) => {
  // Handler for working threshold change
  const handleWorkingThresholdChange = (e) => {
    const value = Number(e.target.value);
    if (value > partialThreshold) {
      setWorkingThreshold(value);
    } else {
      // If workingThreshold is less than or equal to partialThreshold, adjust partialThreshold
      setWorkingThreshold(value);
      if (value <= partialThreshold) {
        const newPartial = value - 1;
        setPartialThreshold(newPartial);
        if (newPartial <= absentThreshold) {
          setAbsentThreshold(newPartial - 1);
        }
      }
    }
  };

  // Handler for partial threshold change
  const handlePartialThresholdChange = (e) => {
    const value = Number(e.target.value);
    if (value < workingThreshold && value > absentThreshold) {
      setPartialThreshold(value);
    } else if (value >= workingThreshold) {
      // Adjust workingThreshold if partialThreshold becomes too large
      setPartialThreshold(value);
      setWorkingThreshold(value + 1);
    } else if (value <= absentThreshold) {
      // Adjust absentThreshold if partialThreshold becomes too small
      setPartialThreshold(value);
      setAbsentThreshold(value - 1);
    }
  };

  // Handler for absent threshold change
  const handleAbsentThresholdChange = (e) => {
    const value = Number(e.target.value);
    if (value < partialThreshold) {
      setAbsentThreshold(value);
    } else {
      // Adjust partialThreshold if absentThreshold becomes too large
      setAbsentThreshold(value);
      setPartialThreshold(value + 1);
      if (value + 1 >= workingThreshold) {
        setWorkingThreshold(value + 2);
      }
    }
  };

  return (
    <div className="bg-[#F9FAFB] p-6 rounded-lg border border-gray-300 shadow-md mb-6">
      <h3 className="text-[#000000] font-semibold text-lg mb-4">Threshold Settings</h3>
      <div className="space-y-6">
        {/* Working Threshold Slider */}
        <div>
          <label className="text-[#000000] text-sm font-medium">
            Working Threshold: {workingThreshold} hours
          </label>
          <input
            type="range"
            min="1"
            max="24"
            value={workingThreshold}
            onChange={handleWorkingThresholdChange}
            className="w-full h-2 rounded-lg appearance bg-blue-200 cursor-pointer"
          />
        </div>

        {/* Partial Threshold Slider */}
        <div>
          <label className="text-[#000000] text-sm font-medium">
            Partial Threshold: {partialThreshold} hours
          </label>
          <input
            type="range"
            min="0"
            max="23"
            value={partialThreshold}
            onChange={handlePartialThresholdChange}
            className="w-full h-2 rounded-lg appearance bg-gray-200 cursor-pointer"
          />
        </div>

        {/* Absent Threshold Slider */}
        <div>
          <label className="text-[#000000] text-sm font-medium">
            Absent Threshold: {absentThreshold} hours
          </label>
          <input
            type="range"
            min="0"
            max="22"
            value={absentThreshold}
            onChange={handleAbsentThresholdChange}
            className="w-full h-2  rounded-lg appearance bg-[#FFFFFF] cursor-pointer"
          />
        </div>
      </div>

      {/* Custom CSS for Slider */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: bg-gray-200;
          width: 16px;
          height: 16px;
          background: #2563EB;
          cursor: pointer;
          border-radius: 50%;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #2563EB;
          cursor: pointer;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
};

export default ThresholdSliderPanel;