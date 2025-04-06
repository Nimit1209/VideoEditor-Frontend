import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../CSS/ProjectEditor.css';
import TimelineComponent from './TimelineComponent.js';
import VideoPreview from './VideoPreview';

const API_BASE_URL = 'http://localhost:8080';

const ProjectEditor = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [audios, setAudios] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1080, height: 1920 });
  const [currentTime, setCurrentTime] = useState(0);
  const [videoLayers, setVideoLayers] = useState([[], [], []]);
  const [audioLayers, setAudioLayers] = useState([[], [], []]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(30);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [tempSegmentValues, setTempSegmentValues] = useState({});
  const [isTransformOpen, setIsTransformOpen] = useState(false);
  const [thumbnailsGenerated, setThumbnailsGenerated] = useState(false);
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState(true);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(true);
  const [previewHeight, setPreviewHeight] = useState('auto');
  const [isTextToolOpen, setIsTextToolOpen] = useState(false);
  const [editingTextSegment, setEditingTextSegment] = useState(null);
  const [textSettings, setTextSettings] = useState({
    text: 'New Text',
    fontFamily: 'Arial',
    fontSize: 24,
    fontColor: '#FFFFFF',
    backgroundColor: 'transparent',
    duration: 5,
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [tempFilterSettings, setTempFilterSettings] = useState({});

  const navigate = useNavigate();
  const { projectId } = useParams();
  const updateTimeoutRef = useRef(null);

  const toggleTransformPanel = () => setIsTransformOpen((prev) => !prev);
  const toggleMediaPanel = () => setIsMediaPanelOpen((prev) => !prev);
  const toggleToolsPanel = () => setIsToolsPanelOpen((prev) => !prev);
  const toggleFiltersPanel = () => setIsFiltersOpen((prev) => !prev);

  const toggleTextTool = () => {
    if (selectedSegment && selectedSegment.type === 'text') {
      setIsTextToolOpen((prev) => !prev);
    } else {
      setIsTextToolOpen(false);
    }
  };

  const handleTextSegmentSelect = (segment) => {
    setEditingTextSegment(segment);
    if (segment && segment.type === 'text') {
      setTextSettings({
        text: segment.text || 'New Text',
        fontFamily: segment.fontFamily || 'Arial',
        fontSize: segment.fontSize || 24,
        fontColor: segment.fontColor || '#FFFFFF',
        backgroundColor: segment.backgroundColor || 'transparent',
        duration: segment.duration || 5,
      });
      setIsTextToolOpen(true);
    } else {
      setIsTextToolOpen(false);
    }
  };

  const updateTextSettings = (newSettings) => {
    setTextSettings(newSettings);
    if (editingTextSegment) {
      setVideoLayers((prevLayers) => {
        const newLayers = [...prevLayers];
        newLayers[editingTextSegment.layer] = newLayers[editingTextSegment.layer].map((item) =>
          item.id === editingTextSegment.id
            ? {
                ...item,
                ...newSettings,
                duration: newSettings.duration,
                timelineEndTime: item.startTime + newSettings.duration,
              }
            : item
        );
        return newLayers;
      });
      setTotalDuration((prev) => {
        const layer = videoLayers[editingTextSegment.layer];
        const updatedSegment = layer.find((item) => item.id === editingTextSegment.id);
        return Math.max(prev, updatedSegment.startTime + updatedSegment.duration);
      });
    }
  };

  const handleSaveTextSegment = async () => {
    if (!editingTextSegment || !sessionId || !projectId) return;
    try {
      const token = localStorage.getItem('token');
      const updatedTextSegment = {
        ...editingTextSegment,
        ...textSettings,
        timelineStartTime: editingTextSegment.startTime,
        timelineEndTime: editingTextSegment.startTime + textSettings.duration,
      };
      await axios.put(
        `${API_BASE_URL}/projects/${projectId}/update-text`,
        {
          segmentId: editingTextSegment.id,
          text: updatedTextSegment.text,
          fontFamily: updatedTextSegment.fontFamily,
          fontSize: updatedTextSegment.fontSize,
          fontColor: updatedTextSegment.fontColor,
          backgroundColor: updatedTextSegment.backgroundColor,
          timelineStartTime: updatedTextSegment.timelineStartTime,
          timelineEndTime: updatedTextSegment.timelineEndTime,
          layer: updatedTextSegment.layer,
        },
        { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
      );
      setIsTextToolOpen(false);
    } catch (error) {
      console.error('Error saving text segment:', error);
    }
  };

  const openTextTool = async () => {
    if (!sessionId || !projectId) return;
    try {
      const token = localStorage.getItem('token');
      let startTime = currentTime;
      if (videoLayers[0].length > 0) {
        const lastSegment = videoLayers[0][videoLayers[0].length - 1];
        startTime = Math.max(startTime, lastSegment.startTime + lastSegment.duration);
      }
      const duration = textSettings.duration;
      const response = await axios.post(
        `${API_BASE_URL}/projects/${projectId}/add-text`,
        {
          text: textSettings.text,
          layer: 0,
          timelineStartTime: startTime,
          timelineEndTime: startTime + duration,
          fontFamily: textSettings.fontFamily,
          fontSize: textSettings.fontSize,
          fontColor: textSettings.fontColor,
          backgroundColor: textSettings.backgroundColor,
          positionX: 0,
          positionY: 0,
        },
        { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
      );
      const newTextSegment = response.data;
      const newSegment = {
        id: newTextSegment.id,
        type: 'text',
        text: textSettings.text,
        startTime: startTime,
        duration: duration,
        layer: 0,
        fontFamily: textSettings.fontFamily,
        fontSize: textSettings.fontSize,
        fontColor: textSettings.fontColor,
        backgroundColor: textSettings.backgroundColor,
        positionX: 0,
        positionY: 0,
      };
      setVideoLayers((prevLayers) => {
        const newLayers = [...prevLayers];
        newLayers[0].push(newSegment);
        return newLayers;
      });
      setTotalDuration((prev) => Math.max(prev, startTime + duration));
      setSelectedSegment(newSegment);
      setEditingTextSegment(newSegment);
      setTextSettings({
        text: newSegment.text,
        fontFamily: newSegment.fontFamily,
        fontSize: newSegment.fontSize,
        fontColor: newSegment.fontColor,
        backgroundColor: newSegment.backgroundColor,
        duration: newSegment.duration,
      });
      setIsTextToolOpen(true);
    } catch (error) {
      console.error('Error adding text to timeline:', error);
    }
  };

  useEffect(() => {
    if (!projectId) {
      navigate('/dashboard');
      return;
    }
    const initializeProject = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found, redirecting to login');
        navigate('/');
        return;
      }

      try {
        await Promise.all([fetchVideos(), fetchAudios(), fetchPhotos()]);
        console.log(`Initializing session for project ${projectId}`);
        const sessionResponse = await axios.post(
          `${API_BASE_URL}/projects/${projectId}/session`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSessionId(sessionResponse.data);
        console.log('Session ID set:', sessionResponse.data);

        console.log(`Fetching project details for ${projectId}`);
        const projectResponse = await axios.get(
          `${API_BASE_URL}/projects/${projectId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const project = projectResponse.data;
        if (project.width && project.height) {
          setCanvasDimensions({ width: project.width, height: project.height });
        }
      } catch (error) {
        console.error('Error initializing project:', error);
        if (error.response?.status === 403) {
          console.error('Access denied to project. Redirecting to dashboard with error.');
          navigate('/dashboard', { state: { error: 'You do not have permission to access this project.' } });
        } else if (error.response?.status === 401) {
          console.error('Unauthorized. Redirecting to login.');
          navigate('/');
        } else {
          navigate('/dashboard', { state: { error: 'Failed to load project. Please try again.' } });
        }
      }
    };
    initializeProject();
    const handleBeforeUnload = () => {};
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [projectId, navigate]);

  const fetchVideos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/videos/my-videos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedVideos = response.data.map((video) => ({
        ...video,
        filePath: video.filePath || video.filename,
        displayPath: video.title || (video.filePath || video.filename).split('/').pop(),
      }));
      setVideos(updatedVideos);
      await Promise.all(updatedVideos.map((video) => generateVideoThumbnail(video)));
      setThumbnailsGenerated(true);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchAudios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const project = response.data;
      if (project.audioJson) {
        let audioFiles;
        try {
          audioFiles = typeof project.audioJson === 'string' ? JSON.parse(project.audioJson) : project.audioJson;
        } catch (e) {
          console.error('Error parsing audio_json:', e);
          audioFiles = [];
        }
        if (Array.isArray(audioFiles)) {
          const updatedAudios = audioFiles.map((audio) => ({
            id: audio.audioPath || `audio-${audio.audioFileName}-${Date.now()}`,
            fileName: audio.audioFileName,
            displayName: audio.audioFileName.split('/').pop(),
            waveformImage: '/images/audio.jpeg',
          }));
          setAudios(updatedAudios);
        } else {
          setAudios([]);
        }
      } else {
        setAudios([]);
      }
    } catch (error) {
      console.error('Error fetching audios:', error);
      setAudios([]);
    }
  };

  const fetchPhotos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const project = response.data;
      if (project.imagesJson) {
        let imageFiles;
        try {
          imageFiles = typeof project.imagesJson === 'string' ? JSON.parse(project.imagesJson) : project.imagesJson;
        } catch (e) {
          console.error('Error parsing imagesJson:', e);
          imageFiles = [];
        }
        if (Array.isArray(imageFiles)) {
          const updatedPhotos = await Promise.all(
            imageFiles.map(async (image) => {
              const fullFileName = image.imagePath.split('/').pop();
              const originalFileName = fullFileName.replace(`${projectId}_`, '').replace(/^\d+_/, '');
              const thumbnail = await new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = `${API_BASE_URL}/projects/${projectId}/images/${encodeURIComponent(fullFileName)}`;
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const maxWidth = 120;
                  const maxHeight = 80;
                  let width = img.width;
                  let height = img.height;
                  if (width > height) {
                    if (width > maxWidth) {
                      height = (height * maxWidth) / width;
                      width = maxWidth;
                    }
                  } else {
                    if (height > maxHeight) {
                      width = (width * maxHeight) / height;
                      height = maxHeight;
                    }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  ctx.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg'));
                };
                img.onerror = () => resolve(null);
              });
              return {
                id: image.imagePath || `image-${fullFileName}-${Date.now()}`,
                fileName: fullFileName,
                displayName: originalFileName,
                filePath: `${API_BASE_URL}/projects/${projectId}/images/${encodeURIComponent(fullFileName)}`,
                thumbnail,
              };
            })
          );
          setPhotos(updatedPhotos);
          console.log('Fetched photos:', updatedPhotos);
        } else {
          setPhotos([]);
        }
      } else {
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      setPhotos([]);
    }
  };

  useEffect(() => {
    const fetchAndSetLayers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
          params: { sessionId },
          headers: { Authorization: `Bearer ${token}` },
        });
        const project = response.data;
        if (project && project.timelineState) {
          let timelineState;
          try {
            timelineState = typeof project.timelineState === 'string' ? JSON.parse(project.timelineState) : project.timelineState;
          } catch (e) {
            console.error('Failed to parse timeline state:', e);
            timelineState = { segments: [], textSegments: [], audioSegments: [] };
          }
          const newVideoLayers = [[], [], []];
          const newAudioLayers = [[], [], []];

          if (timelineState.segments && timelineState.segments.length > 0) {
            for (const segment of timelineState.segments) {
              const layerIndex = segment.layer || 0;
              if (layerIndex < 0) continue;
              if (layerIndex >= newVideoLayers.length) {
                while (newVideoLayers.length <= layerIndex) newVideoLayers.push([]);
              }
              if (segment.sourceVideoPath) {
                const video = videos.find((v) => {
                  const vPath = v.filePath || v.filename;
                  const normalizedVPath = vPath.startsWith('videos/') ? vPath.substring(7) : vPath;
                  const normalizedVideoPath = segment.sourceVideoPath.startsWith('videos/') ? segment.sourceVideoPath.substring(7) : segment.sourceVideoPath;
                  return normalizedVPath === normalizedVideoPath;
                });
                if (video) {
                  newVideoLayers[layerIndex].push({
                    id: segment.id,
                    type: 'video',
                    startTime: segment.timelineStartTime || 0,
                    duration: (segment.timelineEndTime - segment.timelineStartTime) || 0,
                    filePath: segment.sourceVideoPath,
                    layer: layerIndex,
                    positionX: segment.positionX || 0,
                    positionY: segment.positionY || 0,
                    scale: segment.scale || 1,
                    filters: segment.filters || [],
                  });
                }
              } else if (segment.imageFileName) {
                const photo = photos.find((p) => p.fileName === segment.imageFileName);
                if (photo) {
                  newVideoLayers[layerIndex].push({
                    id: segment.id,
                    type: 'image',
                    startTime: segment.timelineStartTime || 0,
                    duration: (segment.timelineEndTime - segment.timelineStartTime) || 5,
                    fileName: segment.imageFileName,
                    filePath: photo.filePath,
                    layer: layerIndex,
                    positionX: segment.positionX || 0,
                    positionY: segment.positionY || 0,
                    scale: segment.scale || 1,
                    filters: segment.filters || [],
                  });
                }
              }
            }
          }

          if (timelineState.textSegments && timelineState.textSegments.length > 0) {
            for (const textSegment of timelineState.textSegments) {
              const layerIndex = textSegment.layer || 0;
              if (layerIndex < 0) continue;
              if (layerIndex >= newVideoLayers.length) {
                while (newVideoLayers.length <= layerIndex) newVideoLayers.push([]);
              }
              newVideoLayers[layerIndex].push({
                id: textSegment.id,
                type: 'text',
                text: textSegment.text,
                startTime: textSegment.timelineStartTime || 0,
                duration: (textSegment.timelineEndTime - textSegment.timelineStartTime) || 0,
                layer: layerIndex,
                fontFamily: textSegment.fontFamily || 'Arial',
                fontSize: textSegment.fontSize || 24,
                fontColor: textSegment.fontColor || '#FFFFFF',
                backgroundColor: textSegment.backgroundColor || 'transparent',
              });
            }
          }

          if (timelineState.audioSegments && timelineState.audioSegments.length > 0) {
            for (const audioSegment of timelineState.audioSegments) {
              const backendLayer = audioSegment.layer || -1;
              const layerIndex = Math.abs(backendLayer) - 1;
              if (layerIndex >= newAudioLayers.length) {
                while (newAudioLayers.length <= layerIndex) newAudioLayers.push([]);
              }
              newAudioLayers[layerIndex].push({
                id: audioSegment.id,
                type: 'audio',
                fileName: audioSegment.audioFileName || audioSegment.audioPath.split('/').pop(),
                startTime: audioSegment.timelineStartTime || 0,
                duration: (audioSegment.timelineEndTime - audioSegment.timelineStartTime) || 0,
                layer: backendLayer,
                displayName: audioSegment.audioFileName ? audioSegment.audioFileName.split('/').pop() : audioSegment.audioPath.split('/').pop(),
                waveformImage: '/images/audio.jpeg',
              });
            }
          }

          setVideoLayers(newVideoLayers);
          setAudioLayers(newAudioLayers);
          let maxEndTime = 0;
          [...newVideoLayers, ...newAudioLayers].forEach((layer) => {
            layer.forEach((item) => {
              const endTime = item.startTime + item.duration;
              if (endTime > maxEndTime) maxEndTime = endTime;
            });
          });
          setTotalDuration(maxEndTime > 0 ? maxEndTime : 0);
        }
      } catch (error) {
        console.error('Error fetching timeline data for layers:', error);
      }
    };
    if (projectId && sessionId && videos.length > 0) fetchAndSetLayers();
  }, [projectId, sessionId, videos, photos]);

  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/videos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      const newVideo = response.data;
      if (newVideo) await fetchVideos();
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleAudioUpload = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('audioFileName', file.name);
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/projects/${projectId}/upload-audio`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
      );
      const updatedProject = response.data;
      if (updatedProject) await fetchAudios();
    } catch (error) {
      console.error('Error uploading audio:', error);
    } finally {
      setUploading(false);
    }
  };

  const generateVideoThumbnail = async (video) => {
    if (!video || (!video.filePath && !video.filename)) return;
    if (video.thumbnail) return;
    let path = video.filePath || video.filename;
    if (path.startsWith('videos/')) path = path.substring(7);
    const videoUrl = `${API_BASE_URL}/videos/${encodeURIComponent(path)}`;
    try {
      const videoElement = document.createElement('video');
      videoElement.crossOrigin = 'anonymous';
      videoElement.src = videoUrl;
      await new Promise((resolve, reject) => {
        videoElement.onloadeddata = resolve;
        videoElement.onerror = reject;
        setTimeout(resolve, 5000);
      });
      const seekTime = Math.min(1, (video.duration || 0) * 0.25);
      videoElement.currentTime = seekTime;
      await new Promise((resolve) => {
        videoElement.onseeked = resolve;
        setTimeout(resolve, 2000);
      });
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg');
      video.thumbnail = thumbnail;
      setVideos((prevVideos) =>
        prevVideos.map((v) =>
          (v.filePath || v.filename) === (video.filePath || video.filename) ? { ...v, thumbnail } : v
        )
      );
    } catch (error) {
      console.error('Error creating thumbnail for video:', path, error);
    }
  };

  const handleSaveProject = async () => {
    if (!projectId || !sessionId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/projects/${projectId}/save`,
        {},
        { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Project saved successfully!');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project. Please try again.');
    }
  };

  const handleExportProject = async () => {
    if (!projectId || !sessionId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/projects/${projectId}/export`,
        {},
        { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
      );
      const exportedFileName = response.data;
      alert(`Project exported successfully as ${exportedFileName}!`);
    } catch (error) {
      console.error('Error exporting project:', error);
      alert('Failed to export project. Please try again.');
    }
  };

  const handleMediaDragStart = (e, media, type) => {
    const mediaId = media.id || `media-${media.filePath || media.fileName || media.filename || media.imageFileName}-${Date.now()}`;
    const dragData = {
      type: type,
      isDragOperation: true,
      [type === 'media' ? 'video' : type === 'photo' ? 'photo' : 'audio']: {
        id: mediaId,
        filePath: type === 'media' ? (media.filePath || media.filename) : undefined,
        fileName: type === 'audio' ? media.fileName : type === 'photo' ? media.fileName : undefined,
        displayPath: media.displayPath || media.displayName || (media.filePath || media.fileName || media.filename || media.imageFileName)?.split('/').pop(),
        duration: media.duration || 5,
        thumbnail: media.thumbnail || (type === 'photo' ? media.filePath : undefined),
      },
    };
    const jsonString = JSON.stringify(dragData);
    e.dataTransfer.setData('application/json', jsonString);
    e.dataTransfer.setData('text/plain', jsonString);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleVideoClick = async (video, isDragEvent = false) => {
    if (isDragEvent) return;
    setSelectedVideo(video);
    if (!sessionId || !projectId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
        params: { sessionId },
        headers: { Authorization: `Bearer ${token}` },
      });
      let timelineState;
      if (response.data && response.data.timelineState) {
        try {
          timelineState = typeof response.data.timelineState === 'string' ? JSON.parse(response.data.timelineState) : response.data.timelineState;
        } catch (e) {
          console.error('Failed to parse timeline state:', e);
          timelineState = { segments: [] };
        }
      } else {
        timelineState = { segments: [] };
      }
      let endTime = 0;
      if (timelineState.segments && timelineState.segments.length > 0) {
        const layer0Segments = timelineState.segments.filter((seg) => seg.layer === 0);
        layer0Segments.forEach((segment) => {
          const segmentEndTime = segment.timelineStartTime + (segment.endTime - segment.startTime);
          if (segmentEndTime > endTime) endTime = segmentEndTime;
        });
      }
      await addVideoToTimeline(video.filePath || video.filename, 0, endTime, null);
    } catch (error) {
      console.error('Error adding video to timeline:', error);
    }
  };

  const addVideoToTimeline = async (videoPath, layer, timelineStartTime, timelineEndTime, startTimeWithinVideo, endTimeWithinVideo) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/projects/${projectId}/add-to-timeline`,
        {
          videoPath,
          layer: layer || 0,
          timelineStartTime: timelineStartTime || 0,
          timelineEndTime: timelineEndTime || null,
          startTime: startTimeWithinVideo || 0,
          endTime: endTimeWithinVideo || null,
        },
        { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
      );
      const segment = response.data;
      const video = videos.find((v) => (v.filePath || v.filename) === videoPath);
      if (video && segment) {
        const newSegment = {
          id: segment.id || `${videoPath}-${Date.now()}`,
          type: 'video',
          startTime: timelineStartTime || 0,
          duration: (timelineEndTime || segment.timelineEndTime) - (timelineStartTime || 0),
          filePath: videoPath,
          layer: layer || 0,
          positionX: segment.positionX || 0,
          positionY: segment.positionY || 0,
          scale: segment.scale || 1,
          thumbnail: video.thumbnail,
          filters: segment.filters || [],
        };
        setVideoLayers((prevLayers) => {
          const newLayers = [...prevLayers];
          while (newLayers.length <= layer) newLayers.push([]);
          newLayers[layer] = [...newLayers[layer], newSegment];
          return newLayers;
        });
        setTotalDuration((prev) => Math.max(prev, newSegment.startTime + newSegment.duration));
      }
    } catch (error) {
      console.error('Error adding video to timeline:', error);
      throw error;
    }
  };

  const handleTimeUpdate = (newTime) => setCurrentTime(newTime);

  // CHANGE 1: Moved handleDeleteSegment above useEffect hooks to prevent "Cannot access before initialization" error
  const handleDeleteSegment = async () => {
    if (!selectedSegment || !sessionId || !projectId) return;

    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      switch (selectedSegment.type) {
        case 'video':
          endpoint = `${API_BASE_URL}/projects/timeline/video/${sessionId}/${selectedSegment.id}`;
          break;
        case 'audio':
          endpoint = `${API_BASE_URL}/projects/timeline/audio/${sessionId}/${selectedSegment.id}`;
          break;
        case 'image':
          endpoint = `${API_BASE_URL}/projects/timeline/image/${sessionId}/${selectedSegment.id}`;
          break;
        case 'text':
          endpoint = `${API_BASE_URL}/projects/timeline/text/${sessionId}/${selectedSegment.id}`;
          break;
        default:
          console.error('Unknown segment type:', selectedSegment.type);
          return;
      }

      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (selectedSegment.type === 'audio') {
        setAudioLayers((prevLayers) => {
          const newLayers = [...prevLayers];
          const layerIndex = Math.abs(selectedSegment.layer) - 1;
          newLayers[layerIndex] = newLayers[layerIndex].filter(
            (item) => item.id !== selectedSegment.id
          );
          return newLayers;
        });
      } else {
        setVideoLayers((prevLayers) => {
          const newLayers = [...prevLayers];
          newLayers[selectedSegment.layer] = newLayers[selectedSegment.layer].filter(
            (item) => item.id !== selectedSegment.id
          );
          return newLayers;
        });
      }

      const allLayers = [...videoLayers, ...audioLayers];
      let maxEndTime = 0;
      allLayers.forEach((layer) => {
        layer.forEach((item) => {
          const endTime = item.startTime + item.duration;
          if (endTime > maxEndTime) maxEndTime = endTime;
        });
      });
      setTotalDuration(maxEndTime);

      setSelectedSegment(null);
      setIsTextToolOpen(false);
      setIsTransformOpen(false);
      setIsFiltersOpen(false);
    } catch (error) {
      console.error('Error deleting segment:', error);
      alert('Failed to delete segment. Please try again.');
    }
  };

  // CHANGE 2: Updated useEffect to reference handleDeleteSegment after its definition
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
      // Backspace key to delete selected segment
      if (e.key === 'Backspace' && selectedSegment && !isPlaying) {
        e.preventDefault();
        handleDeleteSegment();
      }
      if (!isPlaying) {
        if (e.key === 'ArrowLeft') setCurrentTime((time) => Math.max(0, time - 1 / 30));
        else if (e.key === 'ArrowRight') setCurrentTime((time) => Math.min(totalDuration, time + 1 / 30));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, totalDuration, selectedSegment, handleDeleteSegment]);

  useEffect(() => {
    if (isPlaying && currentTime >= totalDuration) {
      setIsPlaying(false);
      setCurrentTime(totalDuration);
    }
  }, [currentTime, isPlaying, totalDuration]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingHandle(true);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingHandle) return;
    const contentWrapper = document.querySelector('.content-wrapper');
    const wrapperHeight = contentWrapper.clientHeight;
    const controlsPanelHeight = 60;
    const resizeHandleHeight = 6;
    const mouseY = e.clientY;
    const wrapperTop = contentWrapper.getBoundingClientRect().top;
    const distanceFromTop = mouseY - wrapperTop;

    const previewHeightPx = distanceFromTop - resizeHandleHeight;
    const minPreviewHeight = 100;
    const maxPreviewHeight = wrapperHeight - controlsPanelHeight - resizeHandleHeight - 150;
    const clampedPreviewHeight = Math.max(minPreviewHeight, Math.min(maxPreviewHeight, previewHeightPx));

    const remainingHeight = wrapperHeight - clampedPreviewHeight - controlsPanelHeight - resizeHandleHeight;
    const timelineHeightPercent = (remainingHeight / (wrapperHeight - controlsPanelHeight)) * 100;
    const minTimelineHeight = 10;
    const maxTimelineHeight = 50;
    const clampedTimelineHeight = Math.max(minTimelineHeight, Math.min(maxTimelineHeight, timelineHeightPercent));

    setPreviewHeight(`${clampedPreviewHeight}px`);
    setTimelineHeight(clampedTimelineHeight);
  };

  const handleMouseUp = () => setIsDraggingHandle(false);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingHandle]);

  const toggleSection = (section) => setExpandedSection(expandedSection === section ? null : section);

  const handleSegmentSelect = (segment) => {
    setSelectedSegment(segment);
    if (segment) {
      setTempSegmentValues({
        positionX: segment.positionX || 0,
        positionY: segment.positionY || 0,
        scale: segment.scale || 1,
      });
      const filterMap = {};
      (segment.filters || []).forEach((filter) => {
        filterMap[filter.filterName] = filter.filterValue;
      });
      setTempFilterSettings(filterMap);
    } else {
      setTempSegmentValues({});
      setTempFilterSettings({});
    }
    handleTextSegmentSelect(segment);
  };

  const updateSegmentProperty = (property, value) => {
    setTempSegmentValues((prev) => ({ ...prev, [property]: value }));
    const targetLayers = selectedSegment.layer < 0 ? audioLayers : videoLayers;
    const layerIndex = selectedSegment.layer < 0 ? Math.abs(selectedSegment.layer) - 1 : selectedSegment.layer;
    const newLayers = targetLayers.map((layer, idx) =>
      idx === layerIndex
        ? layer.map((item) => (item.id === selectedSegment.id ? { ...item, [property]: value } : item))
        : layer
    );
    if (selectedSegment.layer < 0) setAudioLayers(newLayers);
    else setVideoLayers(newLayers);
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => saveSegmentChanges(), 500);
  };

  const saveSegmentChanges = async () => {
    if (!selectedSegment || !sessionId || !projectId) return;
    try {
      const token = localStorage.getItem('token');
      if (selectedSegment.type === 'audio') {
        await axios.put(
          `${API_BASE_URL}/projects/${projectId}/update-audio`,
          { audioSegmentId: selectedSegment.id, positionX: tempSegmentValues.positionX, positionY: tempSegmentValues.positionY },
          { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (selectedSegment.type === 'video') {
        const requestBody = {
          segmentId: selectedSegment.id,
          positionX: tempSegmentValues.positionX,
          positionY: tempSegmentValues.positionY,
          scale: tempSegmentValues.scale,
        };
        await axios.put(
          `${API_BASE_URL}/projects/${projectId}/update-segment`,
          requestBody,
          { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (selectedSegment.type === 'image') {
        const requestBody = {
          segmentId: selectedSegment.id,
          positionX: tempSegmentValues.positionX,
          positionY: tempSegmentValues.positionY,
          scale: tempSegmentValues.scale,
        };
        await axios.put(
          `${API_BASE_URL}/projects/${projectId}/update-image`,
          requestBody,
          { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (selectedSegment.type === 'text') {
        const updatedTextSettings = {
          ...selectedSegment,
          ...textSettings,
        };
        await axios.put(
          `${API_BASE_URL}/projects/${projectId}/update-text`,
          {
            segmentId: selectedSegment.id,
            text: updatedTextSettings.text,
            fontFamily: updatedTextSettings.fontFamily,
            fontSize: updatedTextSettings.fontSize,
            fontColor: updatedTextSettings.fontColor,
            backgroundColor: updatedTextSettings.backgroundColor,
            timelineStartTime: updatedTextSettings.startTime,
            timelineEndTime: updatedTextSettings.startTime + updatedTextSettings.duration,
            layer: updatedTextSettings.layer,
          },
          { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Error saving segment changes:', error);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('image', file);
    formData.append('imageFileName', file.name);
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/projects/${projectId}/upload-image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }
      );
      const updatedProject = response.data;
      if (updatedProject) await fetchPhotos();
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoClick = async (photo, isDragEvent = false) => {
    if (uploading) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
        params: { sessionId },
        headers: { Authorization: `Bearer ${token}` },
      });
      let timelineState = response.data.timelineState
        ? typeof response.data.timelineState === 'string'
          ? JSON.parse(response.data.timelineState)
          : response.data.timelineState
        : { segments: [], textSegments: [] };
      let endTime = 0;
      const layer0Items = [
        ...(timelineState.segments || []).filter((seg) => seg.layer === 0),
        ...(timelineState.textSegments || []).filter((seg) => seg.layer === 0),
      ];
      if (layer0Items.length > 0) {
        layer0Items.forEach((item) => {
          const segmentEndTime = item.timelineStartTime + (item.timelineEndTime - item.timelineStartTime);
          if (segmentEndTime > endTime) endTime = segmentEndTime;
        });
      }
      await axios.post(
        `${API_BASE_URL}/projects/${projectId}/add-project-image-to-timeline`,
        { imageFileName: photo.fileName, layer: 0, timelineStartTime: endTime, timelineEndTime: endTime + 5 },
        { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedResponse = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
        params: { sessionId },
        headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedTimelineState = typeof updatedResponse.data.timelineState === 'string' ? JSON.parse(updatedResponse.data.timelineState) : updatedResponse.data.timelineState;
      const newImageSegment = updatedTimelineState.segments.find((seg) => seg.imagePath && seg.timelineStartTime === endTime && seg.layer === 0);
      if (newImageSegment) {
        const filename = newImageSegment.imagePath.split('/').pop();
        const thumbnail = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = `${API_BASE_URL}/projects/${projectId}/images/${encodeURIComponent(filename)}`;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxWidth = 120;
            const maxHeight = 80;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg'));
          };
          img.onerror = () => resolve(null);
        });
        setVideoLayers((prevLayers) => {
          const newLayers = [...prevLayers];
          newLayers[0].push({
            id: newImageSegment.id,
            type: 'image',
            fileName: photo.fileName,
            filePath: `${API_BASE_URL}/projects/${projectId}/images/${encodeURIComponent(filename)}`,
            thumbnail,
            startTime: newImageSegment.timelineStartTime,
            duration: newImageSegment.timelineEndTime - newImageSegment.timelineStartTime,
            layer: 0,
            positionX: newImageSegment.positionX || 50,
            positionY: newImageSegment.positionY || 50,
            scale: newImageSegment.scale || 1,
            filters: newImageSegment.filters || [],
          });
          return newLayers;
        });
      }
    } catch (error) {
      console.error('Error adding photo to timeline:', error);
    }
  };

  const handleApplyFilter = async () => {
    if (!selectedSegment || !sessionId || !projectId || Object.keys(tempFilterSettings).length === 0) return;
    if (selectedSegment.type !== 'video' && selectedSegment.type !== 'image') return;

    try {
      const token = localStorage.getItem('token');
      const filterRequests = Object.entries(tempFilterSettings).map(([filterName, filterValue]) =>
        axios.post(
          `${API_BASE_URL}/projects/${projectId}/apply-filter`,
          {
            segmentId: selectedSegment.id,
            filterName,
            filterValue: filterValue.toString(),
          },
          { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
        )
      );
      await Promise.all(filterRequests);
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
        params: { sessionId },
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedTimelineState = typeof response.data.timelineState === 'string' ? JSON.parse(response.data.timelineState) : response.data.timelineState;
      const updatedSegment = updatedTimelineState.segments.find((seg) => seg.id === selectedSegment.id);
      if (updatedSegment) {
        setVideoLayers((prevLayers) => {
          const newLayers = [...prevLayers];
          newLayers[selectedSegment.layer] = newLayers[selectedSegment.layer].map((item) =>
            item.id === selectedSegment.id ? { ...item, filters: updatedSegment.filters || [] } : item
          );
          return newLayers;
        });
        setSelectedSegment((prev) => ({ ...prev, filters: updatedSegment.filters || [] }));
      }
      setTempFilterSettings((prev) => {
        const newSettings = { ...prev };
        Object.keys(tempFilterSettings).forEach((key) => delete newSettings[key]);
        return newSettings;
      });
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  };

  const handleRemoveFilter = async (filterName) => {
    if (!selectedSegment || !sessionId || !projectId) return;
    try {
      const token = localStorage.getItem('token');
      const filterToRemove = selectedSegment.filters.find((f) => f.filterName === filterName);
      if (!filterToRemove) return;
      await axios.post(
        `${API_BASE_URL}/projects/${projectId}/remove-filter`,
        {
          segmentId: selectedSegment.id,
          filterId: filterToRemove.filterId,
        },
        { params: { sessionId }, headers: { Authorization: `Bearer ${token}` } }
      );
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
        params: { sessionId },
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedTimelineState = typeof response.data.timelineState === 'string' ? JSON.parse(response.data.timelineState) : response.data.timelineState;
      const updatedSegment = updatedTimelineState.segments.find((seg) => seg.id === selectedSegment.id);
      if (updatedSegment) {
        setVideoLayers((prevLayers) => {
          const newLayers = [...prevLayers];
          newLayers[selectedSegment.layer] = newLayers[selectedSegment.layer].map((item) =>
            item.id === selectedSegment.id ? { ...item, filters: updatedSegment.filters || [] } : item
          );
          return newLayers;
        });
        setSelectedSegment((prev) => ({ ...prev, filters: updatedSegment.filters || [] }));
        setTempFilterSettings((prev) => {
          const newSettings = { ...prev };
          delete newSettings[filterName];
          return newSettings;
        });
      }
    } catch (error) {
      console.error('Error removing filter:', error);
    }
  };

  const updateFilterSetting = (filterName, filterValue) => {
    setTempFilterSettings((prev) => ({
      ...prev,
      [filterName]: filterValue,
    }));
    setVideoLayers((prevLayers) => {
      const newLayers = [...prevLayers];
      newLayers[selectedSegment.layer] = newLayers[selectedSegment.layer].map((item) =>
        item.id === selectedSegment.id
          ? {
              ...item,
              filters: item.filters
                ? item.filters
                    .filter((f) => f.filterName !== filterName)
                    .concat([{ filterName, filterValue: filterValue.toString(), filterId: `${filterName}-${Date.now()}` }])
                : [{ filterName, filterValue: filterValue.toString(), filterId: `${filterName}-${Date.now()}` }],
            }
          : item
      );
      return newLayers;
    });
  };

  return (
    <div className="project-editor">
      <aside className={`media-panel ${isMediaPanelOpen ? 'open' : 'closed'}`}>
        <div className="panel-header">
          <button className="toggle-button" onClick={toggleMediaPanel}>
            {isMediaPanelOpen ? '◄' : '►'}
          </button>
        </div>
        {isMediaPanelOpen && (
          <div className="panel-content">
            <h2 onClick={() => setExpandedSection(null)}>Media Library</h2>
            <div className="media-section">
              <button className="section-button" onClick={() => toggleSection('videos')}>
                Videos
              </button>
              {expandedSection === 'videos' && (
                <div className="section-content">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    id="upload-video"
                    className="hidden-input"
                  />
                  <label htmlFor="upload-video" className="upload-button">
                    {uploading ? 'Uploading...' : 'Upload Video'}
                  </label>
                  {videos.length === 0 ? (
                    <div className="empty-state">Pour it in, I am waiting!</div>
                  ) : (
                    <div className="video-list">
                      {videos.map((video) => (
                        <div
                          key={video.id || video.filePath || video.filename}
                          className={`video-item ${selectedVideo && (selectedVideo.id === video.id || selectedVideo.filePath === video.filePath) ? 'selected' : ''}`}
                          draggable={true}
                          onDragStart={(e) => handleMediaDragStart(e, video, 'media')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVideoClick(video);
                          }}
                          onDragEnd={(e) => e.stopPropagation()}
                        >
                          {video.thumbnail ? (
                            <div
                              className="video-thumbnail"
                              style={{
                                backgroundImage: `url(${video.thumbnail})`,
                                height: '130px',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: '4px',
                              }}
                            ></div>
                          ) : (
                            <div className="video-thumbnail-placeholder"></div>
                          )}
                          {video.title || (video.displayPath ? video.displayPath.split('/').pop().replace(/^\d+_/, '') : 'Untitled Video')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="media-section">
              <button className="section-button" onClick={() => toggleSection('photos')}>
                Photos
              </button>
              {expandedSection === 'photos' && (
                <div className="section-content">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    id="upload-photo"
                    className="hidden-input"
                  />
                  <label htmlFor="upload-photo" className="upload-button">
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </label>
                  {photos.length === 0 ? (
                    <div className="empty-state">Pour it in, I am waiting!</div>
                  ) : (
                    <div className="photo-list">
                      {photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="photo-item"
                          draggable={true}
                          onDragStart={(e) => handleMediaDragStart(e, photo, 'photo')}
                          onClick={() => handlePhotoClick(photo)}
                        >
                          <img src={photo.filePath} alt={photo.displayName} className="photo-thumbnail" />
                          <div className="photo-title">{photo.displayName}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="media-section">
              <button className="section-button" onClick={() => toggleSection('audios')}>
                Audio
              </button>
              {expandedSection === 'audios' && (
                <div className="section-content">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    id="upload-audio"
                    className="hidden-input"
                  />
                  <label htmlFor="upload-audio" className="upload-button">
                    {uploading ? 'Uploading...' : 'Upload Audio'}
                  </label>
                  {audios.length === 0 ? (
                    <div className="empty-state">Pour it in, I am waiting!</div>
                  ) : (
                    <div className="audio-list">
                      {audios.map((audio) => (
                        <div
                          key={audio.id}
                          className="audio-item"
                          draggable={true}
                          onDragStart={(e) => handleMediaDragStart(e, audio, 'audio')}
                        >
                          <img src={audio.waveformImage || '/images/audio.jpeg'} alt="Audio Waveform" className="audio-waveform" />
                          <div className="audio-title">{audio.displayName}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      <div className="main-content">
        <div className="content-wrapper">
          <div className="preview-section">
            <VideoPreview
              layers={[...videoLayers, ...audioLayers]}
              currentTime={currentTime}
              isPlaying={isPlaying}
              canvasDimensions={canvasDimensions}
              onTimeUpdate={setCurrentTime}
              totalDuration={totalDuration}
              setIsPlaying={setIsPlaying}
              containerHeight={previewHeight}
            />
          </div>
          <div className={`resize-preview-section ${isDraggingHandle ? 'dragging' : ''}`} onMouseDown={handleMouseDown}></div>
          <div className="controls-panel">
            <button className="control-button" onClick={handleSaveProject}>
              Save Project
            </button>
            <button
              className="delete-button"
              onClick={handleDeleteSegment}
              disabled={!selectedSegment}
            >
              🗑️
            </button>
            <button className="control-button" onClick={handleExportProject}>
              Export Video
            </button>
          </div>
          <div className="timeline-section" style={{ height: `${timelineHeight}%` }}>
            {sessionId ? (
              <TimelineComponent
                videos={videos}
                audios={audios}
                sessionId={sessionId}
                projectId={projectId}
                totalDuration={totalDuration}
                setTotalDuration={setTotalDuration}
                onVideoSelect={(time, video) => setCurrentTime(time)}
                canvasDimensions={canvasDimensions}
                addVideoToTimeline={addVideoToTimeline}
                onTimeUpdate={handleTimeUpdate}
                onSegmentSelect={handleSegmentSelect}
                videoLayers={videoLayers}
                audioLayers={audioLayers}
                setVideoLayers={setVideoLayers}
                setAudioLayers={setAudioLayers}
                thumbnailsGenerated={thumbnailsGenerated}
                openTextTool={openTextTool}
                onDeleteSegment={handleDeleteSegment}
              />
            ) : (
              <div className="loading-message">Loading timeline...</div>
            )}
          </div>
        </div>
      </div>

      <aside className={`tools-panel ${isToolsPanelOpen ? 'open' : 'closed'}`}>
        <div className="panel-header">
          <button className="toggle-button" onClick={toggleToolsPanel}>
            {isToolsPanelOpen ? '►' : '◄'}
          </button>
        </div>
        {isToolsPanelOpen && (
          <div className="panel-content">
            <h2>Tools</h2>
            <div className="tools-buttons">
              <button className={`tool-button ${isTransformOpen ? 'active' : ''}`} onClick={toggleTransformPanel}>
                Transform
              </button>
              <button
                className={`tool-button ${isFiltersOpen ? 'active' : ''}`}
                onClick={toggleFiltersPanel}
                disabled={!selectedSegment || (selectedSegment.type !== 'video' && selectedSegment.type !== 'image')}
              >
                Filters
              </button>
              <button
                className={`tool-button ${isTextToolOpen ? 'active' : ''}`}
                onClick={toggleTextTool}
                disabled={!selectedSegment || selectedSegment.type !== 'text'}
              >
                Text
              </button>
            </div>
            {selectedSegment && isTransformOpen && (
              <div className="transform-panel">
                <h3>Transform</h3>
                <div className="control-group">
                  <label>Position X (px)</label>
                  <input
                    type="number"
                    value={tempSegmentValues.positionX || 0}
                    onChange={(e) => updateSegmentProperty('positionX', parseInt(e.target.value) || 0)}
                    step="1"
                    style={{ width: '100px' }}
                  />
                </div>
                <div className="control-group">
                  <label>Position Y (px)</label>
                  <input
                    type="number"
                    value={tempSegmentValues.positionY || 0}
                    onChange={(e) => updateSegmentProperty('positionY', parseInt(e.target.value) || 0)}
                    step="1"
                    style={{ width: '100px' }}
                  />
                </div>
                {(selectedSegment.type === 'video' || selectedSegment.type === 'image') && (
                  <div className="control-group">
                    <label>Scale</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={tempSegmentValues.scale || 1}
                        onChange={(e) => updateSegmentProperty('scale', parseFloat(e.target.value))}
                      />
                      <span>{(tempSegmentValues.scale || 1).toFixed(1)}x</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {selectedSegment && (selectedSegment.type === 'video' || selectedSegment.type === 'image') && isFiltersOpen && (
              <div className="filters-panel" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <h3>Filters</h3>
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
                        value={tempFilterSettings.brightness || 0}
                        onChange={(e) => updateFilterSetting('brightness', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.brightness || 0}
                        onChange={(e) => updateFilterSetting('brightness', e.target.value)}
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
                        value={tempFilterSettings.contrast || 1}
                        onChange={(e) => updateFilterSetting('contrast', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.contrast || 1}
                        onChange={(e) => updateFilterSetting('contrast', e.target.value)}
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
                        value={tempFilterSettings.saturation || 1}
                        onChange={(e) => updateFilterSetting('saturation', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.saturation || 1}
                        onChange={(e) => updateFilterSetting('saturation', e.target.value)}
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
                        value={tempFilterSettings.hue || 0}
                        onChange={(e) => updateFilterSetting('hue', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.hue || 0}
                        onChange={(e) => updateFilterSetting('hue', e.target.value)}
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
                        value={tempFilterSettings.gamma || 1}
                        onChange={(e) => updateFilterSetting('gamma', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.gamma || 1}
                        onChange={(e) => updateFilterSetting('gamma', e.target.value)}
                        step="0.1"
                        min="0.1"
                        max="10"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Color Balance (R,G,B: -1 to 1)</label>
                    <input
                      type="text"
                      value={tempFilterSettings.colorbalance || '0,0,0'}
                      onChange={(e) => updateFilterSetting('colorbalance', e.target.value)}
                      placeholder="r,g,b (e.g., 0.1,-0.2,0.3)"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="control-group">
                    <label>Levels (in_min/in_max/out_min/out_max)</label>
                    <input
                      type="text"
                      value={tempFilterSettings.levels || '0/255/0/255'}
                      onChange={(e) => updateFilterSetting('levels', e.target.value)}
                      placeholder="e.g., 0/255/16/235"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="control-group">
                    <label>Curves (r:g:b)</label>
                    <input
                      type="text"
                      value={tempFilterSettings.curves || "r='0/0 1/1':g='0/0 1/1':b='0/0 1/1'"}
                      onChange={(e) => updateFilterSetting('curves', e.target.value)}
                      placeholder="e.g., r='0/0 1/1':g='0/0 1/1':b='0/0 1/1'"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div className="filter-group">
                  <h4>Stylization</h4>
                  <div className="control-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={tempFilterSettings.grayscale === '1'}
                        onChange={(e) => updateFilterSetting('grayscale', e.target.checked ? '1' : '0')}
                      />
                      Grayscale
                    </label>
                  </div>
                  <div className="control-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={tempFilterSettings.sepia === '1'}
                        onChange={(e) => updateFilterSetting('sepia', e.target.checked ? '1' : '0')}
                      />
                      Sepia
                    </label>
                  </div>
                  <div className="control-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={tempFilterSettings.vintage === '1'}
                        onChange={(e) => updateFilterSetting('vintage', e.target.checked ? '1' : '0')}
                      />
                      Vintage
                    </label>
                  </div>
                  <div className="control-group">
                    <label>Posterize (2-256)</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="2"
                        max="256"
                        step="1"
                        value={tempFilterSettings.posterize || 8}
                        onChange={(e) => updateFilterSetting('posterize', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.posterize || 8}
                        onChange={(e) => updateFilterSetting('posterize', e.target.value)}
                        step="1"
                        min="2"
                        max="256"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Solarize (0-1)</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={tempFilterSettings.solarize || 0.5}
                        onChange={(e) => updateFilterSetting('solarize', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.solarize || 0.5}
                        onChange={(e) => updateFilterSetting('solarize', e.target.value)}
                        step="0.1"
                        min="0"
                        max="1"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={tempFilterSettings.invert === '1'}
                        onChange={(e) => updateFilterSetting('invert', e.target.checked ? '1' : '0')}
                      />
                      Invert
                    </label>
                  </div>
                </div>
                <div className="filter-group">
                  <h4>Blur and Sharpen</h4>
                  <div className="control-group">
                    <label>Blur (0-10)</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={tempFilterSettings.blur || 0}
                        onChange={(e) => updateFilterSetting('blur', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.blur || 0}
                        onChange={(e) => updateFilterSetting('blur', e.target.value)}
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
                        value={tempFilterSettings.sharpen || 0}
                        onChange={(e) => updateFilterSetting('sharpen', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.sharpen || 0}
                        onChange={(e) => updateFilterSetting('sharpen', e.target.value)}
                        step="0.1"
                        min="-2"
                        max="2"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Edge Detection (0-1)</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={tempFilterSettings.edge || 0.5}
                        onChange={(e) => updateFilterSetting('edge', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.edge || 0.5}
                        onChange={(e) => updateFilterSetting('edge', e.target.value)}
                        step="0.1"
                        min="0"
                        max="1"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="filter-group">
                  <h4>Distortion and Noise</h4>
                  <div className="control-group">
                    <label>Noise (0-100)</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={tempFilterSettings.noise || 0}
                        onChange={(e) => updateFilterSetting('noise', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.noise || 0}
                        onChange={(e) => updateFilterSetting('noise', e.target.value)}
                        step="1"
                        min="0"
                        max="100"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Vignette (1-10)</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={tempFilterSettings.vignette || 4}
                        onChange={(e) => updateFilterSetting('vignette', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.vignette || 4}
                        onChange={(e) => updateFilterSetting('vignette', e.target.value)}
                        step="1"
                        min="1"
                        max="10"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Pixelize (2-64)</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="2"
                        max="64"
                        step="1"
                        value={tempFilterSettings.pixelize || 8}
                        onChange={(e) => updateFilterSetting('pixelize', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.pixelize || 8}
                        onChange={(e) => updateFilterSetting('pixelize', e.target.value)}
                        step="1"
                        min="2"
                        max="64"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="filter-group">
                  <h4>Transformation</h4>
                  <div className="control-group">
                    <label>Rotate (degrees)</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="-360"
                        max="360"
                        step="1"
                        value={tempFilterSettings.rotate || 0}
                        onChange={(e) => updateFilterSetting('rotate', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.rotate || 0}
                        onChange={(e) => updateFilterSetting('rotate', e.target.value)}
                        step="1"
                        min="-360"
                        max="360"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Flip</label>
                    <select
                      value={tempFilterSettings.flip || 'none'}
                      onChange={(e) => updateFilterSetting('flip', e.target.value)}
                    >
                      <option value="none">None</option>
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <label>Crop (w:h:x:y)</label>
                    <input
                      type="text"
                      value={tempFilterSettings.crop || `${canvasDimensions.width}:${canvasDimensions.height}:0:0`}
                      onChange={(e) => updateFilterSetting('crop', e.target.value)}
                      placeholder="e.g., 720:480:0:0"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="control-group">
                    <label>Opacity (0-1)</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={tempFilterSettings.opacity || 1}
                        onChange={(e) => updateFilterSetting('opacity', e.target.value)}
                      />
                      <input
                        type="number"
                        value={tempFilterSettings.opacity || 1}
                        onChange={(e) => updateFilterSetting('opacity', e.target.value)}
                        step="0.1"
                        min="0"
                        max="1"
                        style={{ width: '60px', marginLeft: '10px' }}
                      />
                    </div>
                    </div>
                </div>
                <div className="filter-actions">
                  <button onClick={handleApplyFilter} disabled={Object.keys(tempFilterSettings).length === 0}>
                    Apply Filters
                  </button>
                </div>
                {selectedSegment.filters && selectedSegment.filters.length > 0 && (
                  <div className="applied-filters">
                    <h4>Applied Filters</h4>
                    {selectedSegment.filters.map((filter) => (
                      <div key={filter.filterId} className="applied-filter-item">
                        {filter.filterName}: {filter.filterValue}
                        <button
                          onClick={() => handleRemoveFilter(filter.filterName)}
                          className="remove-filter-button"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedSegment && selectedSegment.type === 'text' && isTextToolOpen && (
              <div className="text-tool-panel">
                <h3>Text Settings</h3>
                <div className="control-group">
                  <label>Text</label>
                  <textarea
                    value={textSettings.text}
                    onChange={(e) => updateTextSettings({ ...textSettings, text: e.target.value })}
                    rows="3"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="control-group">
                  <label>Font Family</label>
                  <select
                    value={textSettings.fontFamily}
                    onChange={(e) => updateTextSettings({ ...textSettings, fontFamily: e.target.value })}
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>
                <div className="control-group">
                  <label>Font Size (px)</label>
                  <input
                    type="number"
                    value={textSettings.fontSize}
                    onChange={(e) =>
                      updateTextSettings({ ...textSettings, fontSize: parseInt(e.target.value) || 24 })
                    }
                    min="8"
                    step="1"
                    style={{ width: '100px' }}
                  />
                </div>
                <div className="control-group">
                  <label>Font Color</label>
                  <input
                    type="color"
                    value={textSettings.fontColor}
                    onChange={(e) => updateTextSettings({ ...textSettings, fontColor: e.target.value })}
                  />
                </div>
                <div className="control-group">
                  <label>Background Color</label>
                  <input
                    type="color"
                    value={textSettings.backgroundColor === 'transparent' ? '#000000' : textSettings.backgroundColor}
                    onChange={(e) =>
                      updateTextSettings({ ...textSettings, backgroundColor: e.target.value })
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={textSettings.backgroundColor === 'transparent'}
                      onChange={(e) =>
                        updateTextSettings({
                          ...textSettings,
                          backgroundColor: e.target.checked ? 'transparent' : '#000000',
                        })
                      }
                    />
                    Transparent
                  </label>
                </div>
                <div className="control-group">
                  <label>Duration (s)</label>
                  <input
                    type="number"
                    value={textSettings.duration}
                    onChange={(e) =>
                      updateTextSettings({ ...textSettings, duration: parseFloat(e.target.value) || 5 })
                    }
                    min="1"
                    step="0.1"
                    style={{ width: '100px' }}
                  />
                </div>
                <button onClick={handleSaveTextSegment}>Save Text</button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

export default ProjectEditor;