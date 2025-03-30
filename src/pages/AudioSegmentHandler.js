import React from 'react';
import axios from 'axios';

const AudioSegmentHandler = ({
  projectId,
  sessionId,
  audioLayers,
  setAudioLayers,
  saveHistory,
  autoSave,
  loadProjectTimeline,
  API_BASE_URL,
  timelineRef,
}) => {
  const updateAudioSegment = async (audioSegmentId, newStartTime, newLayer, newDuration) => {
    if (!projectId || !sessionId) return;
    try {
      const token = localStorage.getItem('token');
      const layer = audioLayers[Math.abs(newLayer) - 1];
      const item = layer.find(i => i.id === audioSegmentId);
      const originalDuration = item.duration;
      const timelineEndTime = newStartTime + (newDuration || originalDuration);
      const requestBody = {
        audioSegmentId,
        timelineStartTime: newStartTime,
        timelineEndTime: timelineEndTime,
        layer: newLayer,
        startTime: item.startTimeWithinAudio || 0,
        endTime: item.endTimeWithinAudio || newDuration || originalDuration,
      };
      await axios.put(
        `${API_BASE_URL}/projects/${projectId}/update-audio`,
        requestBody,
        {
          params: { sessionId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(`Updated audio segment ${audioSegmentId} to start at ${newStartTime}s, end at ${timelineEndTime}s, layer ${newLayer}`);
    } catch (error) {
      console.error('Error updating audio segment position:', error);
    }
  };

  const handleAudioDrop = async (e, draggingItem, dragLayer, mouseX, mouseY, timeScale, dragOffset, snapIndicators) => {
    if (!sessionId) return;

    if (!timelineRef.current) {
      console.error('Timeline ref is not available');
      return undefined;
    }

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const layerHeight = 40;
    const relativeMouseY = mouseY - timelineRect.top;

    // Ensure timelineRef.current is available before querying DOM elements
    const timelineLayers = timelineRef.current.querySelectorAll('.timeline-layer');
    if (!timelineLayers) {
      console.error('Timeline layers not found');
      return undefined;
    }

    const totalVideoLayers = timelineLayers.length - audioLayers.length - 2; // Subtract audio layers and two "Drop to create new layer" areas
    const reversedIndex = Math.floor(relativeMouseY / layerHeight);
    let targetLayerIndex;

    // Determine if the drop is in the audio layers section
    if (reversedIndex <= totalVideoLayers) {
      // Dropped in video layers or above
      console.log('Cannot drop audio in video layers');
      return undefined;
    } else if (reversedIndex >= totalVideoLayers + 1 && reversedIndex < totalVideoLayers + 1 + audioLayers.length) {
      // Dropped in audio layers
      targetLayerIndex = totalVideoLayers + audioLayers.length - reversedIndex;
    } else {
      // Dropped in "Drop to create new layer" for audio
      targetLayerIndex = audioLayers.length;
    }

    targetLayerIndex = Math.max(0, targetLayerIndex);
    const backendLayer = -(targetLayerIndex + 1); // Map frontend layer 0 to backend -1, 1 to -2, etc.

    if (!draggingItem) {
      const dataString = e.dataTransfer.getData('application/json');
      if (dataString) {
        const data = JSON.parse(dataString);
        if (data.type === 'audio') {
          const audio = data.audio;
          let dropTimePosition = (mouseX - timelineRect.left) / timeScale;
          let newAudioLayers = [...audioLayers];
          while (newAudioLayers.length <= targetLayerIndex) newAudioLayers.push([]);
          const targetLayerAudios = newAudioLayers[targetLayerIndex];
          let adjustedStartTime = Math.max(0, dropTimePosition);
          let hasOverlap = true;
          while (hasOverlap) {
            hasOverlap = targetLayerAudios.some(existingAudio => {
              const existingStart = existingAudio.startTime;
              const existingEnd = existingStart + existingAudio.duration;
              const newAudioEnd = adjustedStartTime + audio.duration;
              return (adjustedStartTime < existingEnd && newAudioEnd > existingStart);
            });
            if (hasOverlap) {
              const overlappingAudio = targetLayerAudios.find(existingAudio => {
                const existingStart = existingAudio.startTime;
                const existingEnd = existingStart + existingAudio.duration;
                const newAudioEnd = adjustedStartTime + audio.duration;
                return (adjustedStartTime < existingEnd && newAudioEnd > existingStart);
              });
              if (overlappingAudio) {
                adjustedStartTime = overlappingAudio.startTime + overlappingAudio.duration;
              } else break;
            }
          }
          await axios.post(
            `${API_BASE_URL}/projects/${projectId}/add-project-audio-to-timeline`,
            {
              audioFileName: audio.fileName,
              layer: backendLayer,
              timelineStartTime: adjustedStartTime,
              timelineEndTime: adjustedStartTime + audio.duration,
            },
            {
              params: { sessionId },
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            }
          );
          loadProjectTimeline();
        }
      }
      return undefined;
    }

    if (draggingItem.type !== 'audio') return undefined;

    let actualLayerIndex = targetLayerIndex;
    const newStartTime = snapIndicators.length > 0
      ? snapIndicators[0].time - (snapIndicators[0].edge === 'end' ? draggingItem.duration : 0)
      : (mouseX - timelineRect.left) / timeScale - dragOffset;
    const adjustedStartTime = Math.max(0, newStartTime);
    let newAudioLayers = [...audioLayers];
    while (newAudioLayers.length <= actualLayerIndex) newAudioLayers.push([]);

    const hasOverlap = newAudioLayers[actualLayerIndex].some(audio => {
      if (draggingItem && audio.id === draggingItem.id) return false;
      const audioStart = audio.startTime;
      const audioEnd = audioStart + audio.duration;
      const newAudioEnd = adjustedStartTime + draggingItem.duration;
      return (adjustedStartTime < audioEnd && newAudioEnd > audioStart);
    });

    if (hasOverlap) {
      console.log('Overlap detected. Cannot place audio here.');
      return undefined;
    }

    const frontendDragLayer = Math.abs(dragLayer) - 1;
    if (actualLayerIndex === frontendDragLayer) {
      newAudioLayers[actualLayerIndex] = newAudioLayers[actualLayerIndex].filter(a => a.id !== draggingItem.id);
    } else {
      newAudioLayers[frontendDragLayer] = newAudioLayers[frontendDragLayer].filter(a => a.id !== draggingItem.id);
    }
    const updatedItem = { ...draggingItem, startTime: adjustedStartTime, layer: backendLayer };
    newAudioLayers[actualLayerIndex].push(updatedItem);
    setAudioLayers(newAudioLayers);
    saveHistory([], newAudioLayers); // Pass empty videoLayers since only audioLayers changed
    autoSave([], newAudioLayers); // Pass empty videoLayers since only audioLayers changed
    await updateAudioSegment(draggingItem.id, adjustedStartTime, backendLayer);
  };

  const handleAudioSplit = async (item, clickTime, layerIndex) => {
    const splitTime = clickTime - item.startTime;
    if (splitTime <= 0.1 || splitTime >= item.duration - 0.1) return;

    const firstPartDuration = splitTime;
    const secondPartDuration = item.duration - splitTime;
    let newAudioLayers = [...audioLayers];
    const layer = newAudioLayers[layerIndex];
    const itemIndex = layer.findIndex(i => i.id === item.id);

    const originalAudioStartTime = item.startTimeWithinAudio || 0;
    const originalAudioEndTime = item.endTimeWithinAudio || item.duration;

    const firstPart = {
      ...item,
      duration: firstPartDuration,
      endTimeWithinAudio: originalAudioStartTime + firstPartDuration,
    };
    layer[itemIndex] = firstPart;

    const secondPart = {
      ...item,
      id: `${item.id}-split-${Date.now()}`,
      startTime: item.startTime + splitTime,
      duration: secondPartDuration,
      startTimeWithinAudio: originalAudioStartTime + firstPartDuration,
      endTimeWithinAudio: originalAudioEndTime,
    };
    layer.push(secondPart);

    newAudioLayers[layerIndex] = layer;
    setAudioLayers(newAudioLayers);
    saveHistory([], newAudioLayers); // Pass empty videoLayers since only audioLayers changed

    await updateAudioSegment(item.id, item.startTime, item.layer, firstPartDuration);
    await axios.post(
      `${API_BASE_URL}/projects/${projectId}/add-project-audio-to-timeline`,
      {
        audioFileName: item.fileName,
        layer: item.layer,
        timelineStartTime: secondPart.startTime,
        timelineEndTime: secondPart.startTime + secondPartDuration,
        startTime: secondPart.startTimeWithinAudio,
        endTime: secondPart.endTimeWithinAudio,
      },
      {
        params: { sessionId },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }
    );
    autoSave([], newAudioLayers); // Pass empty videoLayers since only audioLayers changed
    await loadProjectTimeline();
  };

  return { handleAudioDrop, updateAudioSegment, handleAudioSplit };
};

export default AudioSegmentHandler;