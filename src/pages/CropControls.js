import React, { useState } from 'react';
import '../CSS/CropControls.css';

const CropControls = ({
  selectedSegment,
  tempSegmentValues,
  setTempSegmentValues,
  updateSegmentProperty,
  canvasDimensions,
}) => {
  const [error, setError] = useState('');
  console.log('CropControls props:', { selectedSegment, tempSegmentValues });

  if (!selectedSegment || (selectedSegment.type !== 'video' && selectedSegment.type !== 'image')) {
    console.log('CropControls not rendering: invalid selectedSegment', selectedSegment);
    return null;
  }

  const { width: canvasWidth, height: canvasHeight } = canvasDimensions;

  const properties = [
    { name: 'cropL', label: 'Crop Left (%)', min: 0, max: 100, step: 0.1 },
    { name: 'cropR', label: 'Crop Right (%)', min: 0, max: 100, step: 0.1 },
    { name: 'cropT', label: 'Crop Top (%)', min: 0, max: 100, step: 0.1 },
    { name: 'cropB', label: 'Crop Bottom (%)', min: 0, max: 100, step: 0.1 },
  ];

  const handleCropChange = (propName, newValue) => {
    if (isNaN(newValue) || newValue < 0 || newValue > 100) {
      setError(`Invalid value for ${propName}. Must be between 0 and 100.`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    const currentValues = { ...tempSegmentValues };
    let cropL = propName === 'cropL' ? newValue : (currentValues.cropL ?? 0);
    let cropR = propName === 'cropR' ? newValue : (currentValues.cropR ?? 0);
    let cropT = propName === 'cropT' ? newValue : (currentValues.cropT ?? 0);
    let cropB = propName === 'cropB' ? newValue : (currentValues.cropB ?? 0);
  
    if (cropL + cropR >= 100) {
      setError('Total crop (left + right) must be less than 100%.');
      setTimeout(() => setError(''), 3000);
      if (propName === 'cropL') cropL = 100 - cropR;
      if (propName === 'cropR') cropR = 100 - cropL;
      newValue = propName === 'cropL' ? cropL : cropR;
    }
    if (cropT + cropB >= 100) {
      setError('Total crop (top + bottom) must be less than 100%.');
      setTimeout(() => setError(''), 3000);
      if (propName === 'cropT') cropT = 100 - cropB;
      if (propName === 'cropB') cropB = 100 - cropT;
      newValue = propName === 'cropT' ? cropT : cropB;
    }
  
    const updatedValues = { ...currentValues, [propName]: newValue };
    setTempSegmentValues(updatedValues);
    console.log('Crop change:', { propName, newValue, updatedValues });
    updateSegmentProperty(propName, newValue);
  };
  
  return (
    <div className="crop-controls">
      <h3>Crop</h3>
      {error && <div className="error-message">{error}</div>}
      {properties.map((prop) => {
        const value = tempSegmentValues[prop.name] ?? 0;

        return (
          <div key={prop.name} className="crop-control">
            <label>{prop.label}</label>
            <div className="slider-container">
              <input
                type="range"
                min={prop.min}
                max={prop.max}
                step={prop.step}
                value={value}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value);
                  handleCropChange(prop.name, newValue);
                }}
              />
              <input
                type="number"
                min={prop.min}
                max={prop.max}
                step={prop.step}
                value={value}
                onChange={(e) => {
                  const newValue = parseFloat(e.target.value);
                  if (!isNaN(newValue)) {
                    handleCropChange(prop.name, newValue);
                  }
                }}
                style={{ width: '60px', marginLeft: '10px' }}
              />
              <span className="slider-value">{value.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CropControls;