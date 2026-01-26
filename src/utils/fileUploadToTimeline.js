import toast from 'react-hot-toast';

/**
 * Background server sync - upload file to server (non-blocking)
 */
export const syncFileToServer = (file, fileType) => {
  console.log(`[Server Sync] Would upload ${fileType}: ${file.name}`);
};

const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getAudioDuration = (audioUrl) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(audio.duration * 1000);
    audio.onerror = () => resolve(5000);
    audio.src = audioUrl;
  });
};

export const getVideoDuration = (videoUrl) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve(video.duration * 1000);
    video.onerror = () => resolve(10000);
    video.src = videoUrl;
  });
};

export const addAudioToTimeline = async (store, file, row, startTime = 0) => {
  const audioUrl = URL.createObjectURL(file);
  const duration = await getAudioDuration(audioUrl);

  await store.addExistingAudio({
    base64Audio: audioUrl,
    durationMs: duration,
    row,
    startTime,
    audioType: 'music',
    id: generateId('audio'),
    name: file.name,
  });

  toast.success(`Added ${file.name} to timeline`);
  syncFileToServer(file, 'audio');
};

export const addImageToTimeline = async (store, file, row, startTime = 0) => {
  const imageUrl = URL.createObjectURL(file);

  await store.addImageLocal({
    url: imageUrl,
    minUrl: imageUrl,
    row,
    startTime,
  });

  toast.success(`Added ${file.name} to timeline`);
  syncFileToServer(file, 'image');
};

export const addVideoToTimeline = async (store, file, row, startTime = 0) => {
  const videoUrl = URL.createObjectURL(file);
  const duration = await getVideoDuration(videoUrl);

  await store.handleVideoUploadFromUrl({
    url: videoUrl,
    title: file.name,
    key: null,
    duration,
    row,
    startTime,
    isNeedLoader: false,
  });

  toast.success(`Added ${file.name} to timeline`);
  syncFileToServer(file, 'video');
};

export const handleFileDropToTimeline = async (store, file, row, startTime = 0) => {
  const fileType = file.type || '';

  try {
    if (fileType.startsWith('audio/')) {
      await addAudioToTimeline(store, file, row, startTime);
      return true;
    }

    if (fileType.startsWith('image/')) {
      await addImageToTimeline(store, file, row, startTime);
      return true;
    }

    if (fileType.startsWith('video/')) {
      await addVideoToTimeline(store, file, row, startTime);
      return true;
    }

    toast.error(`Unsupported file type: ${fileType || file.name}`);
    return false;
  } catch (error) {
    console.error(`Error adding ${file.name} to timeline:`, error);
    toast.error(`Failed to add ${file.name} to timeline`);
    return false;
  }
};
