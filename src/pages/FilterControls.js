import React from 'react';

// FilterControls component to handle all filter-related UI and logic
const FilterControls = ({
  selectedSegment,
  filterParams,
  setFilterParams,
  appliedFilters,
  setAppliedFilters,
  updateFilters,
  handleRemoveFilter,
  projectId,
  sessionId,
  setVideoLayers,
  setSelectedSegment,
}) => {
  // Function to update filter settings with debouncing
  const updateFilterSetting = (filterName, filterValue) => {
    setFilterParams((prev) => {
      const newParams = {
        ...prev,
        [filterName]: filterValue,
      };
      // Debounce filter updates to prevent excessive API calls
      if (window.filterUpdateTimeoutRef) {
        clearTimeout(window.filterUpdateTimeoutRef);
      }
      window.filterUpdateTimeoutRef = setTimeout(() => {
        updateFilters({ [filterName]: filterValue });
      }, 500);
      return newParams;
    });
  };

  return (
    <div className="filters-panel" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      <h3>Filters</h3>
      {/* Check if a valid segment is selected for applying filters */}
      {!selectedSegment || (selectedSegment.type !== 'video' && selectedSegment.type !== 'image') ? (
        <p>Select a video or image segment to apply filters</p>
      ) : (
        <>
          {/* Color Adjustments Section */}
          <div className="filter-group">
            <h4>Color Adjustments</h4>
            <div className="control-group">
              <label>Brightness (-1 to 1)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.1"
                  value={filterParams.brightness !== undefined ? filterParams.brightness : 0}
                  onChange={(e) => updateFilterSetting('brightness', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.brightness !== undefined ? filterParams.brightness : 0}
                  onChange={(e) => updateFilterSetting('brightness', parseFloat(e.target.value))}
                  step="0.1"
                  min="-1"
                  max="1"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Contrast (0 to 2)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={filterParams.contrast !== undefined ? filterParams.contrast : 1}
                  onChange={(e) => updateFilterSetting('contrast', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.contrast !== undefined ? filterParams.contrast : 1}
                  onChange={(e) => updateFilterSetting('contrast', parseFloat(e.target.value))}
                  step="0.1"
                  min="0"
                  max="2"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Saturation (0 to 2)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={filterParams.saturation !== undefined ? filterParams.saturation : 1}
                  onChange={(e) => updateFilterSetting('saturation', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.saturation !== undefined ? filterParams.saturation : 1}
                  onChange={(e) => updateFilterSetting('saturation', parseFloat(e.target.value))}
                  step="0.1"
                  min="0"
                  max="2"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Hue (-180 to 180)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={filterParams.hue !== undefined ? filterParams.hue : 0}
                  onChange={(e) => updateFilterSetting('hue', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.hue !== undefined ? filterParams.hue : 0}
                  onChange={(e) => updateFilterSetting('hue', parseInt(e.target.value))}
                  step="1"
                  min="-180"
                  max="180"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Gamma (0.1 to 10)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={filterParams.gamma !== undefined ? filterParams.gamma : 1}
                  onChange={(e) => updateFilterSetting('gamma', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.gamma !== undefined ? filterParams.gamma : 1}
                  onChange={(e) => updateFilterSetting('gamma', parseFloat(e.target.value))}
                  step="0.1"
                  min="0.1"
                  max="10"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            {/* Color Balance Controls */}
            <div className="control-group">
              <label>Color Balance (R: -1 to 1)</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={filterParams.colorbalance_r !== undefined ? filterParams.colorbalance_r : 0}
                onChange={(e) => {
                  const r = parseFloat(e.target.value);
                  const g = filterParams.colorbalance_g || 0;
                  const b = filterParams.colorbalance_b || 0;
                  updateFilterSetting('colorbalance', `${r},${g},${b}`);
                  setFilterParams((prev) => ({ ...prev, colorbalance_r: r }));
                }}
              />
            </div>
            <div className="control-group">
              <label>Color Balance (G: -1 to 1)</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={filterParams.colorbalance_g !== undefined ? filterParams.colorbalance_g : 0}
                onChange={(e) => {
                  const r = filterParams.colorbalance_r || 0;
                  const g = parseFloat(e.target.value);
                  const b = filterParams.colorbalance_b || 0;
                  updateFilterSetting('colorbalance', `${r},${g},${b}`);
                  setFilterParams((prev) => ({ ...prev, colorbalance_g: g }));
                }}
              />
            </div>
            <div className="control-group">
              <label>Color Balance (B: -1 to 1)</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={filterParams.colorbalance_b !== undefined ? filterParams.colorbalance_b : 0}
                onChange={(e) => {
                  const r = filterParams.colorbalance_r || 0;
                  const g = filterParams.colorbalance_g || 0;
                  const b = parseFloat(e.target.value);
                  updateFilterSetting('colorbalance', `${r},${g},${b}`);
                  setFilterParams((prev) => ({ ...prev, colorbalance_b: b }));
                }}
              />
            </div>
          </div>

          {/* Blur and Sharpen Section */}
          <div className="filter-group">
            <h4>Blur and Sharpen</h4>
            <div className="control-group">
              <label>Blur (0 to 10)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={filterParams.blur !== undefined ? filterParams.blur : 0}
                  onChange={(e) => updateFilterSetting('blur', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.blur !== undefined ? filterParams.blur : 0}
                  onChange={(e) => updateFilterSetting('blur', parseInt(e.target.value))}
                  step="1"
                  min="0"
                  max="10"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Sharpen (-2 to 2)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={filterParams.sharpen !== undefined ? filterParams.sharpen : 0}
                  onChange={(e) => updateFilterSetting('sharpen', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.sharpen !== undefined ? filterParams.sharpen : 0}
                  onChange={(e) => updateFilterSetting('sharpen', parseFloat(e.target.value))}
                  step="0.1"
                  min="-2"
                  max="2"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Edge (0 to 1)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filterParams.edge !== undefined ? filterParams.edge : 0}
                  onChange={(e) => updateFilterSetting('edge', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.edge !== undefined ? filterParams.edge : 0}
                  onChange={(e) => updateFilterSetting('edge', parseFloat(e.target.value))}
                  step="0.1"
                  min="0"
                  max="1"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
          </div>

          {/* Stylization Section */}
          <div className="filter-group">
            <h4>Stylization</h4>
            <div className="control-group">
              <label>Grayscale</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={!!filterParams.grayscale}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFilterSetting('grayscale', filterParams.grayscale_intensity || '1');
                    } else {
                      updateFilterSetting('grayscale', '');
                    }
                  }}
                />
                <div className="slider-container" style={{ flex: 1 }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filterParams.grayscale_intensity !== undefined ? filterParams.grayscale_intensity : 1}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setFilterParams((prev) => ({ ...prev, grayscale_intensity: value }));
                      if (filterParams.grayscale) {
                        updateFilterSetting('grayscale', value > 0 ? '1' : '');
                      }
                    }}
                    disabled={!filterParams.grayscale}
                  />
                </div>
              </div>
            </div>
            <div className="control-group">
              <label>Sepia</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={!!filterParams.sepia}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFilterSetting('sepia', filterParams.sepia_intensity || '1');
                    } else {
                      updateFilterSetting('sepia', '');
                    }
                  }}
                />
                <div className="slider-container" style={{ flex: 1 }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filterParams.sepia_intensity !== undefined ? filterParams.sepia_intensity : 1}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setFilterParams((prev) => ({ ...prev, sepia_intensity: value }));
                      if (filterParams.sepia) {
                        updateFilterSetting('sepia', value > 0 ? '1' : '');
                      }
                    }}
                    disabled={!filterParams.sepia}
                  />
                </div>
              </div>
            </div>
            <div className="control-group">
              <label>Vintage</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={!!filterParams.vintage}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFilterSetting('vintage', filterParams.vintage_intensity || '1');
                    } else {
                      updateFilterSetting('vintage', '');
                    }
                  }}
                />
                <div className="slider-container" style={{ flex: 1 }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filterParams.vintage_intensity !== undefined ? filterParams.vintage_intensity : 1}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setFilterParams((prev) => ({ ...prev, vintage_intensity: value }));
                      if (filterParams.vintage) {
                        updateFilterSetting('vintage', value > 0 ? '1' : '');
                      }
                    }}
                    disabled={!filterParams.vintage}
                  />
                </div>
              </div>
            </div>
            <div className="control-group">
              <label>Posterize (2 to 32 levels)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="2"
                  max="32"
                  step="1"
                  value={filterParams.posterize !== undefined ? filterParams.posterize : 8}
                  onChange={(e) => updateFilterSetting('posterize', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.posterize !== undefined ? filterParams.posterize : 8}
                  onChange={(e) => updateFilterSetting('posterize', parseInt(e.target.value))}
                  step="1"
                  min="2"
                  max="32"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Solarize (0 to 1)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filterParams.solarize !== undefined ? filterParams.solarize : 0.5}
                  onChange={(e) => updateFilterSetting('solarize', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.solarize !== undefined ? filterParams.solarize : 0.5}
                  onChange={(e) => updateFilterSetting('solarize', parseFloat(e.target.value))}
                  step="0.1"
                  min="0"
                  max="1"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Invert</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={!!filterParams.invert}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFilterSetting('invert', filterParams.invert_intensity || '1');
                    } else {
                      updateFilterSetting('invert', '');
                    }
                  }}
                />
                <div className="slider-container" style={{ flex: 1 }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filterParams.invert_intensity !== undefined ? filterParams.invert_intensity : 1}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setFilterParams((prev) => ({ ...prev, invert_intensity: value }));
                      if (filterParams.invert) {
                        updateFilterSetting('invert', value > 0 ? '1' : '');
                      }
                    }}
                    disabled={!filterParams.invert}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Distortion and Noise Section */}
          <div className="filter-group">
            <h4>Distortion and Noise</h4>
            <div className="control-group">
              <label>Noise (0 to 100)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={filterParams.noise !== undefined ? filterParams.noise : 0}
                  onChange={(e) => updateFilterSetting('noise', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.noise !== undefined ? filterParams.noise : 0}
                  onChange={(e) => updateFilterSetting('noise', parseInt(e.target.value))}
                  step="1"
                  min="0"
                  max="100"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Vignette (1 to 10)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={filterParams.vignette !== undefined ? filterParams.vignette : 2}
                  onChange={(e) => updateFilterSetting('vignette', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.vignette !== undefined ? filterParams.vignette : 2}
                  onChange={(e) => updateFilterSetting('vignette', parseInt(e.target.value))}
                  step="1"
                  min="1"
                  max="10"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Pixelize (2 to 32)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="2"
                  max="32"
                  step="1"
                  value={filterParams.pixelize !== undefined ? filterParams.pixelize : 8}
                  onChange={(e) => updateFilterSetting('pixelize', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.pixelize !== undefined ? filterParams.pixelize : 8}
                  onChange={(e) => updateFilterSetting('pixelize', parseInt(e.target.value))}
                  step="1"
                  min="2"
                  max="32"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
          </div>

          {/* Transformation Section */}
          <div className="filter-group">
            <h4>Transformation</h4>
            <div className="control-group">
              <label>Rotate (-180 to 180°)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={filterParams.rotate !== undefined ? filterParams.rotate : 0}
                  onChange={(e) => updateFilterSetting('rotate', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.rotate !== undefined ? filterParams.rotate : 0}
                  onChange={(e) => updateFilterSetting('rotate', parseInt(e.target.value))}
                  step="1"
                  min="-180"
                  max="180"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Flip</label>
              <select
                value={filterParams.flip || 'none'}
                onChange={(e) => updateFilterSetting('flip', e.target.value === 'none' ? '' : e.target.value)}
              >
                <option value="none">None</option>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </div>
            <div className="control-group">
              <label>Opacity (0 to 1)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={filterParams.opacity !== undefined ? filterParams.opacity : 1}
                  onChange={(e) => updateFilterSetting('opacity', parseFloat(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.opacity !== undefined ? filterParams.opacity : 1}
                  onChange={(e) => updateFilterSetting('opacity', parseFloat(e.target.value))}
                  step="0.01"
                  min="0"
                  max="1"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
          </div>

          {/* Special Effects Section */}
          <div className="filter-group">
            <h4>Special Effects</h4>
            <div className="control-group">
              <label>Emboss</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={!!filterParams.emboss}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateFilterSetting('emboss', filterParams.emboss_intensity || '1');
                    } else {
                      updateFilterSetting('emboss', '');
                    }
                  }}
                />
                <div className="slider-container" style={{ flex: 1 }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filterParams.emboss_intensity !== undefined ? filterParams.emboss_intensity : 1}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setFilterParams((prev) => ({ ...prev, emboss_intensity: value }));
                      if (filterParams.emboss) {
                        updateFilterSetting('emboss', value > 0 ? '1' : '');
                      }
                    }}
                    disabled={!filterParams.emboss}
                  />
                </div>
              </div>
            </div>
            <div className="control-group">
              <label>Glow (0 to 10)</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={filterParams.glow !== undefined ? filterParams.glow : 2}
                  onChange={(e) => updateFilterSetting('glow', parseInt(e.target.value))}
                />
                <input
                  type="number"
                  value={filterParams.glow !== undefined ? filterParams.glow : 2}
                  onChange={(e) => updateFilterSetting('glow', parseInt(e.target.value))}
                  step="1"
                  min="0"
                  max="10"
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            </div>
            <div className="control-group">
              <label>Overlay</label>
              <select
                value={filterParams.overlay_color || 'red'}
                onChange={(e) => {
                  const color = e.target.value;
                  const opacity = filterParams.overlay_opacity || 0.5;
                  updateFilterSetting('overlay', `${color}@${opacity}`);
                  setFilterParams((prev) => ({ ...prev, overlay_color: color }));
                }}
              >
                <option value="red">Red</option>
                <option value="green">Green</option>
                <option value="blue">Blue</option>
                <option value="yellow">Yellow</option>
              </select>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filterParams.overlay_opacity !== undefined ? filterParams.overlay_opacity : 0.5}
                onChange={(e) => {
                  const opacity = parseFloat(e.target.value);
                  const color = filterParams.overlay_color || 'red';
                  updateFilterSetting('overlay', `${color}@${opacity}`);
                  setFilterParams((prev) => ({ ...prev, overlay_opacity: opacity }));
                }}
                style={{ marginLeft: '10px' }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FilterControls;