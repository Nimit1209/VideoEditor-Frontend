import React, { useState, useEffect } from 'react';
import '../CSS/CropControls.css';

const CropControls = ({
  selectedSegment,
  tempSegmentValues,
  setTempSegmentValues,
  updateSegmentProperty,
  canvasDimensions,
}) => {
  const [error, setError] = useState('');
  const [localValues, setLocalValues] = useState({
    cropL: 0,
    cropR: 0,
    cropT: 0,
    cropB: 0,
  });

  console.log('CropControls props:', { selectedSegment, tempSegmentValues });

  useEffect(() => {
    if (selectedSegment) {
      const newLocalValues = {
        cropL: Number(tempSegmentValues.cropL) || 0,
        cropR: Number(tempSegmentValues.cropR) || 0,
        cropT: Number(tempSegmentValues.cropT) || 0,
        cropB: Number(tempSegmentValues.cropB) || 0,
      };
      setLocalValues(newLocalValues);
      console.log('Initialized localValues:', newLocalValues);
    }
  }, [selectedSegment, tempSegmentValues]);

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

  const validateCropValue = (value) => {
    return !isNaN(value) && value >= 0 && value <= 100;
  };

  const handleCropChange = (propName, newValue) => {
    console.log('handleCropChange called:', { propName, newValue }); // Debug
    if (!validateCropValue(newValue)) {
      setError(`Invalid value for ${propName}. Must be between 0 and 100.`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    let cropL = propName === 'cropL' ? newValue : localValues.cropL;
    let cropR = propName === 'cropR' ? newValue : localValues.cropR;
    let cropT = propName === 'cropT' ? newValue : localValues.cropT;
    let cropB = propName === 'cropB' ? newValue : localValues.cropB;

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

    const updatedLocalValues = {
      ...localValues,
      [propName]: newValue,
    };
    setLocalValues(updatedLocalValues);

    const updatedTempValues = {
      ...tempSegmentValues,
      [propName]: Number(newValue), // Ensure number
    };
    setTempSegmentValues(updatedTempValues);

    console.log('Crop change:', { propName, newValue, updatedTempValues });
    console.log('Calling updateSegmentProperty:', { propName, newValue });

    updateSegmentProperty(propName, Number(newValue));
  };

  const handleSliderMouseUp = (propName, value) => {
    console.log('handleSliderMouseUp called:', { propName, value }); // Debug
    updateSegmentProperty(propName, Number(value));
    console.log('Slider mouse up - committing value:', { propName, value });
  };

  return (
    <div className="crop-controls">
      <h3>Crop</h3>
      {error && <div className="error-message">{error}</div>}
      {properties.map((prop) => {
        const value = localValues[prop.name];
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
                onMouseUp={() => handleSliderMouseUp(prop.name, value)}
                onClick={(e) => {
                  const newValue = parseFloat(e.target.value);
                  handleCropChange(prop.name, newValue);
                  handleSliderMouseUp(prop.name, newValue);
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
                onBlur={(e) => {
                  const newValue = parseFloat(e.target.value);
                  if (!isNaN(newValue)) {
                    handleSliderMouseUp(prop.name, newValue);
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