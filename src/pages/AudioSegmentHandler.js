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
  const updateAudioSegment = async (audioSegmentId, newStartTime, newLayer, newDuration, startTimeWithinAudio, endTimeWithinAudio, draggingItem) => {
    if (!projectId || !sessionId) return;

    try {
      const token = localStorage.getItem('token');
      let item = draggingItem;
      if (!item) {
        const layer = audioLayers[Math.abs(newLayer) - 1];
        item = layer.find(i => i.id === audioSegmentId);
      }
      if (!item) {
        throw new Error(`Audio segment with ID ${audioSegmentId} not found in layer ${newLayer}`);
      }

      const originalDuration = item.duration;
      const timelineEndTime = newStartTime + (newDuration || originalDuration);

      // [Change] Assume item.duration is the timeline duration; fetch actual audio duration if needed
      // For simplicity, we'll use a reasonable max duration if not available; ideally, this should come from item
      const maxAudioDuration = item.maxDuration || 3600; // Default to 1 hour if not known; replace with actual duration if stored

      // [Change] Clamp startTimeWithinAudio and endTimeWithinAudio to valid ranges
      const clampedStartTimeWithinAudio = Math.max(0, Math.min(
        startTimeWithinAudio !== undefined ? startTimeWithinAudio : item.startTimeWithinAudio || 0,
        maxAudioDuration - (newDuration || originalDuration)
      ));
      const clampedEndTimeWithinAudio = Math.max(
        clampedStartTimeWithinAudio + 0.001, // Ensure end > start
        Math.min(
          endTimeWithinAudio !== undefined ? endTimeWithinAudio : (item.endTimeWithinAudio || clampedStartTimeWithinAudio + originalDuration),
          maxAudioDuration
        )
      );

      // [Change] Adjust timelineEndTime if audio bounds were clamped
      const adjustedDuration = clampedEndTimeWithinAudio - clampedStartTimeWithinAudio;
      const adjustedTimelineEndTime = newStartTime + adjustedDuration;

      const requestBody = {
        audioSegmentId,
        timelineStartTime: newStartTime,
        timelineEndTime: adjustedTimelineEndTime,
        layer: newLayer,
        startTime: clampedStartTimeWithinAudio,
        endTime: clampedEndTimeWithinAudio,
        ...(item.volume !== undefined && { volume: item.volume }) // Include volume if available
      };

      const response = await axios.put(
        `${API_BASE_URL}/projects/${projectId}/update-audio`,
        requestBody,
        {
          params: { sessionId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // [Change] Update local item with clamped values to maintain consistency
      const updatedItem = {
        ...item,
        startTime: newStartTime,
        duration: adjustedDuration,
        timelineEndTime: adjustedTimelineEndTime,
        startTimeWithinAudio: clampedStartTimeWithinAudio,
        endTimeWithinAudio: clampedEndTimeWithinAudio,
      };
      const layerIndex = Math.abs(newLayer) - 1;
      setAudioLayers(prevLayers => {
        const newLayers = [...prevLayers];
        newLayers[layerIndex] = newLayers[layerIndex].map(i => i.id === audioSegmentId ? updatedItem : i);
        return newLayers;
      });

      console.log(`Updated audio segment ${audioSegmentId} to start at ${newStartTime}s, end at ${adjustedTimelineEndTime}s, layer ${newLayer}, startTimeWithinAudio at ${clampedStartTimeWithinAudio}s, endTimeWithinAudio at ${clampedEndTimeWithinAudio}s`);
    } catch (error) {
      // [Change] Enhanced error logging with response data
      console.error('Error updating audio segment:', error.response?.data || error.message);
      throw error; // Re-throw to allow caller to handle
    }
  };

  const handleAudioDrop = async (e, draggingItem, dragLayer, mouseX, mouseY, timeScale, dragOffset, snapIndicators) => {
    if (!sessionId || !timelineRef.current) {
      console.error('Session ID or timeline ref missing');
      return undefined;
    }

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const layerHeight = 40;
    const relativeMouseY = mouseY - timelineRect.top;
    const totalVideoLayers = timelineRef.current.querySelectorAll('.timeline-layer').length - audioLayers.length - 2;
    const reversedIndex = Math.floor(relativeMouseY / layerHeight);

    const audioLayerStartIndex = totalVideoLayers + 1;
    const audioLayerEndIndex = totalVideoLayers + 1 + audioLayers.length;

    let targetLayerIndex;
    if (reversedIndex < audioLayerStartIndex) {
      console.log('Cannot drop audio in video layers or top drop area');
      return undefined;
    } else if (reversedIndex >= audioLayerStartIndex && reversedIndex < audioLayerEndIndex) {
      targetLayerIndex = reversedIndex - audioLayerStartIndex;
    } else {
      targetLayerIndex = audioLayers.length;
    }

    targetLayerIndex = Math.max(0, targetLayerIndex);
    const backendLayer = -(targetLayerIndex + 1);

    let newAudioLayers = audioLayers.map(layer => [...layer]);

    if (!draggingItem) {
      const dataString = e.dataTransfer.getData('application/json');
      if (dataString) {
        const data = JSON.parse(dataString);
        if (data.type === 'audio') {
          const audio = data.audio;
          let adjustedStartTime = Math.max(0, (mouseX - timelineRect.left) / timeScale);
          while (newAudioLayers.length <= targetLayerIndex) newAudioLayers.push([]);
          const targetLayerAudios = newAudioLayers[targetLayerIndex];
          let hasOverlap = true;

          while (hasOverlap) {
            hasOverlap = targetLayerAudios.some(existing => {
              const start = existing.startTime;
              const end = start + existing.duration;
              const newEnd = adjustedStartTime + audio.duration;
              return adjustedStartTime < end && newEnd > start;
            });
            if (hasOverlap) {
              const overlapping = targetLayerAudios.find(existing => {
                const start = existing.startTime;
                const end = start + existing.duration;
                const newEnd = adjustedStartTime + audio.duration;
                return adjustedStartTime < end && newEnd > start;
              });
              adjustedStartTime = overlapping.startTime + overlapping.duration;
            }
          }

          console.log('Dropping audio with fileName:', audio.fileName);
          await axios.post(
            `${API_BASE_URL}/projects/${projectId}/add-project-audio-to-timeline`,
            {
              audioFileName: audio.fileName,
              layer: backendLayer,
              timelineStartTime: adjustedStartTime,
              timelineEndTime: adjustedStartTime + audio.duration,
              startTime: 0,
              endTime: audio.duration,
            },
            {
              params: { sessionId },
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            }
          );
          await loadProjectTimeline();
          return undefined;
        }
      }
      return undefined;
    }

    if (draggingItem.type !== 'audio') return undefined;

    const newStartTime = snapIndicators.length > 0
      ? snapIndicators[0].time - (snapIndicators[0].edge === 'end' ? draggingItem.duration : 0)
      : Math.max(0, (mouseX - timelineRect.left) / timeScale - dragOffset);

    console.log('Calculated newStartTime:', newStartTime);

    while (newAudioLayers.length <= targetLayerIndex) newAudioLayers.push([]);

    const hasOverlap = newAudioLayers[targetLayerIndex].some(audio => {
      if (audio.id === draggingItem.id) return false;
      const start = audio.startTime;
      const end = start + audio.duration;
      const newEnd = newStartTime + draggingItem.duration;
      return newStartTime < end && newEnd > start;
    });

    if (hasOverlap) {
      console.log('Overlap detected. Cannot move audio here.');
      return undefined;
    }

    const sourceLayerIndex = draggingItem.layer ? Math.abs(draggingItem.layer) - 1 : -1;
    const isSameLayer = sourceLayerIndex === targetLayerIndex;

    const updatedItem = {
      ...draggingItem,
      startTime: newStartTime,
      layer: backendLayer,
      timelineStartTime: newStartTime,
      timelineEndTime: newStartTime + draggingItem.duration,
    };

    if (isSameLayer) {
      const layer = newAudioLayers[targetLayerIndex];
      const itemIndex = layer.findIndex(a => a.id === draggingItem.id);
      layer[itemIndex] = updatedItem;
    } else {
      if (sourceLayerIndex !== -1) {
        newAudioLayers[sourceLayerIndex] = newAudioLayers[sourceLayerIndex].filter(a => a.id !== draggingItem.id);
      }
      newAudioLayers[targetLayerIndex].push(updatedItem);
    }

    setAudioLayers(newAudioLayers);
    saveHistory([], newAudioLayers);
    autoSave([], newAudioLayers);
    await updateAudioSegment(
      draggingItem.id,
      newStartTime,
      backendLayer,
      draggingItem.duration,
      updatedItem.startTimeWithinAudio,
      updatedItem.endTimeWithinAudio,
      updatedItem
    );

    return updatedItem;
  };

  const handleAudioSplit = async (item, clickTime, layerIndex) => {
    const splitTime = clickTime - item.startTime;
    if (splitTime <= 0.1 || splitTime >= item.duration - 0.1) return;

    const firstPartDuration = splitTime;
    const secondPartDuration = item.duration - splitTime;
    let newAudioLayers = [...audioLayers];
    const layer = newAudioLayers[layerIndex];
    const itemIndex = layer.findIndex(i => i.id === item.id);

    const startWithinAudio = item.startTimeWithinAudio || 0;
    const firstPart = {
      ...item,
      duration: firstPartDuration,
      timelineEndTime: item.startTime + firstPartDuration,
      endTimeWithinAudio: startWithinAudio + firstPartDuration,
    };
    layer[itemIndex] = firstPart;

    const secondPart = {
      ...item,
      id: `${item.id}-split-${Date.now()}`,
      startTime: item.startTime + splitTime,
      timelineStartTime: item.startTime + splitTime,
      duration: secondPartDuration,
      timelineEndTime: item.startTime + item.duration,
      startTimeWithinAudio: startWithinAudio + firstPartDuration,
      endTimeWithinAudio: startWithinAudio + item.duration,
    };
    layer.push(secondPart);

    newAudioLayers[layerIndex] = layer;
    setAudioLayers(newAudioLayers);
    saveHistory([], newAudioLayers);

    await updateAudioSegment(
      item.id,
      item.startTime,
      item.layer,
      firstPartDuration,
      firstPart.startTimeWithinAudio,
      firstPart.endTimeWithinAudio,
      firstPart
    );

    const audioFileName = item.fileName.split('/').pop();
    console.log('Original item.fileName:', item.fileName);
    console.log('Sending audioFileName to backend:', audioFileName);

    try {
      await axios.post(
        `${API_BASE_URL}/projects/${projectId}/add-project-audio-to-timeline`,
        {
          audioFileName: audioFileName,
          layer: item.layer,
          timelineStartTime: secondPart.startTime,
          timelineEndTime: secondPart.timelineEndTime,
          startTime: secondPart.startTimeWithinAudio,
          endTime: secondPart.endTimeWithinAudio,
        },
        {
          params: { sessionId },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      console.log('Successfully added split audio to timeline');
    } catch (error) {
      console.error('Error adding split audio:', error.response?.data || error.message);
      throw error;
    }

    autoSave([], newAudioLayers);
    await loadProjectTimeline();
  };

  return { handleAudioDrop, updateAudioSegment, handleAudioSplit };
};

export default AudioSegmentHandler;