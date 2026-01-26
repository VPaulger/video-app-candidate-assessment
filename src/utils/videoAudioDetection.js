export const videoHasAudio = async videoElement => {
  if (videoElement.audioTracks && videoElement.audioTracks.length > 0) {
    return true;
  }

  if (typeof videoElement.mozHasAudio !== 'undefined') {
    return videoElement.mozHasAudio;
  }

  if (typeof videoElement.webkitAudioDecodedByteCount !== 'undefined') {
    const originalMuted = videoElement.muted;
    const originalCurrentTime = videoElement.currentTime;

    try {
      videoElement.muted = true;
      videoElement.currentTime = 0;

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          videoElement.pause();
          resolve();
        }, 500);

        videoElement.play().then(() => {
          setTimeout(() => {
            clearTimeout(timeout);
            videoElement.pause();
            resolve();
          }, 100);
        }).catch(() => {
          clearTimeout(timeout);
          resolve();
        });
      });

      const hasAudio = videoElement.webkitAudioDecodedByteCount > 0;

      videoElement.muted = originalMuted;
      videoElement.currentTime = originalCurrentTime;

      return hasAudio;
    } catch (e) {
      videoElement.muted = originalMuted;
      videoElement.currentTime = originalCurrentTime;
    }
  }

  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    const source = audioContext.createMediaElementSource(videoElement);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const originalMuted = videoElement.muted;
    videoElement.muted = true;
    videoElement.currentTime = 0;

    await videoElement.play();
    await new Promise(resolve => setTimeout(resolve, 100));
    videoElement.pause();

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const hasAudio = dataArray.some(value => value > 0);

    videoElement.muted = originalMuted;

    source.disconnect();
    analyser.disconnect();
    await audioContext.close();

    return hasAudio;
  } catch (e) {
    console.warn('Could not detect audio in video, assuming it has audio:', e);
    return true;
  }
};

export const analyzeVideoFile = async source => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration * 1000;
        const hasAudio = await videoHasAudio(video);

        resolve({
          videoElement: video,
          hasAudio,
          duration,
        });
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };

    if (source instanceof File || source instanceof Blob) {
      video.src = URL.createObjectURL(source);
    } else if (typeof source === 'string') {
      video.src = source;
    } else {
      reject(new Error('Invalid source type'));
    }
  });
};
