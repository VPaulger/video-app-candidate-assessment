/**
 * Detects if a video file has an audio track
 * Uses multiple browser-specific methods for compatibility
 * @param {HTMLVideoElement} videoElement - The video element to check
 * @returns {Promise<boolean>} - True if video has audio
 */
export const videoHasAudio = async videoElement => {
  // Method 1: Check audioTracks API (Chrome, Safari)
  if (videoElement.audioTracks && videoElement.audioTracks.length > 0) {
    return true;
  }

  // Method 2: Mozilla-specific property
  if (typeof videoElement.mozHasAudio !== 'undefined') {
    return videoElement.mozHasAudio;
  }

  // Method 3: WebKit audio decoded bytes (Chrome)
  if (typeof videoElement.webkitAudioDecodedByteCount !== 'undefined') {
    // Need to play briefly to get decoded bytes
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

      // Restore original state
      videoElement.muted = originalMuted;
      videoElement.currentTime = originalCurrentTime;

      return hasAudio;
    } catch (e) {
      videoElement.muted = originalMuted;
      videoElement.currentTime = originalCurrentTime;
    }
  }

  // Method 4: Use Web Audio API to analyze
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    // Create a MediaElementSource - this will detach audio from video
    // So we need to reconnect it to destination
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

    // Disconnect and close
    source.disconnect();
    analyser.disconnect();
    await audioContext.close();

    return hasAudio;
  } catch (e) {
    // If all methods fail, assume video has audio (safer default)
    console.warn(
      'Could not detect audio in video, assuming it has audio:',
      e
    );
    return true;
  }
};

/**
 * Creates a video element and detects if it has audio
 * @param {File|Blob|string} source - Video file, blob, or URL
 * @returns {Promise<{videoElement: HTMLVideoElement, hasAudio: boolean, duration: number}>}
 */
export const analyzeVideoFile = async source => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration * 1000; // Convert to ms
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

    // Set source based on type
    if (source instanceof File || source instanceof Blob) {
      video.src = URL.createObjectURL(source);
    } else if (typeof source === 'string') {
      video.src = source;
    } else {
      reject(new Error('Invalid source type'));
    }
  });
};
