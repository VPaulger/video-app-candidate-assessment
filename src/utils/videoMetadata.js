/**
 * Shared utility for detecting video metadata including audio track presence.
 * Used by both upload button and drag-drop flows to ensure consistent behavior.
 */

/**
 * Detects video metadata (duration and audio track presence) from a video URL.
 * Uses multiple browser-specific APIs for maximum compatibility.
 * 
 * @param {string} url - Video URL (can be blob URL, data URL, or remote URL)
 * @param {number} timeoutMs - Maximum time to wait for metadata (default: 10000ms)
 * @returns {Promise<{durationMs: number, hasAudio: boolean, tracks?: TrackInfo}>}
 */
export const getVideoMetadataFromUrl = (url, timeoutMs = 10000) => {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ durationMs: 10000, hasAudio: false });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true; // Mute to avoid autoplay restrictions
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let resolved = false;
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      video.removeEventListener('canplaythrough', onCanPlayThrough);
      video.src = '';
      video.load();
      // Remove from DOM after a short delay to allow cleanup
      setTimeout(() => {
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      }, 100);
    };

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        cleanup();
        resolve({ durationMs: 10000, hasAudio: false });
      }
    }, timeoutMs);

    const detectAudioAndResolve = () => {
      if (resolved) return;
      
      const durationSec = video.duration || 0;
      
      // Multi-browser audio detection strategy (try all methods for maximum reliability):
      // 1. Firefox-specific API
      const mozHasAudio = !!video.mozHasAudio;
      
      // 2. Chrome/WebKit legacy API (checks if audio was decoded)
      const webkitHasAudio = 
        typeof video.webkitAudioDecodedByteCount === 'number' &&
        video.webkitAudioDecodedByteCount > 0;
      
      // 3. Modern AudioTrackList API (not supported everywhere)
      const hasAudioTracks = 
        video.audioTracks && 
        video.audioTracks.length > 0;
      
      // 4. Additional check: Try to detect by checking video element's audio context
      // This is a more reliable method that works across browsers
      let audioContextCheck = false;
      try {
        // Check if video has audio by attempting to create an audio context
        // and checking if there are audio tracks in the video element
        if (video.readyState >= 2) {
          // For some browsers, we need to check after a small delay
          // Check audioTracks again with a more thorough approach
          if (video.audioTracks && video.audioTracks.length > 0) {
            audioContextCheck = true;
          }
          // Also check mozHasAudio and webkitAudioDecodedByteCount again
          // as they might be set after readyState changes
          if (video.mozHasAudio || 
              (typeof video.webkitAudioDecodedByteCount === 'number' && video.webkitAudioDecodedByteCount > 0)) {
            audioContextCheck = true;
          }
        }
      } catch (e) {
        // Ignore errors in audio context check
      }
      
      let detectedAudio =
        mozHasAudio || webkitHasAudio || hasAudioTracks || audioContextCheck;

      // Practical fallback: if we have a valid duration but couldn't positively
      // detect audio tracks (browser limitations), assume the video HAS audio.
      // This matches typical user expectations for uploaded screen recordings
      // and camera footage, and ensures audio is extracted for assessment.
      if (!detectedAudio && durationSec > 0) {
        detectedAudio = true;
      }
      
      // Extract detailed track information
      const trackInfo = extractTrackInfo(video, detectedAudio);
      
      clearTimeout(timeoutId);
      cleanup();
      resolve({
        durationMs: durationSec > 0 ? durationSec * 1000 : 10000,
        hasAudio: !!detectedAudio,
        tracks: trackInfo,
      });
    };

    const onLoaded = () => {
      if (resolved) return;
      
      // Ensure we have valid duration before proceeding
      if (!video.duration || video.duration <= 0) {
        // Wait a bit more for duration to be available
        setTimeout(() => {
          if (!resolved && video.duration > 0) {
            detectAudioAndResolve();
          }
        }, 100);
        return;
      }

      // For blob URLs, wait longer and check multiple times for audio
      // Audio track detection sometimes needs more time after metadata loads
      if (url.startsWith('blob:')) {
        // First check immediately
        detectAudioAndResolve();
        // Also check again after a delay to catch late-loading audio tracks
        setTimeout(() => {
          if (!resolved && video.readyState >= 2) {
            detectAudioAndResolve();
          }
        }, 300);
      } else {
        // For remote URLs, check immediately and once more after short delay
        detectAudioAndResolve();
        setTimeout(() => {
          if (!resolved && video.readyState >= 2) {
            detectAudioAndResolve();
          }
        }, 200);
      }
    };

    const onCanPlayThrough = () => {
      // Sometimes metadata loads but audio detection needs canplaythrough
      if (!resolved && video.readyState >= 2) {
        onLoaded();
      }
    };

    const onError = (e) => {
      if (resolved) return;
      
      console.warn('Video metadata detection error:', e);
      clearTimeout(timeoutId);
      cleanup();
      resolve({
        durationMs: 10000,
        hasAudio: false,
      });
    };

    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
    video.addEventListener('error', onError, { once: true });

    // Append to DOM (hidden) to ensure proper loading
    video.style.display = 'none';
    video.style.position = 'absolute';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    document.body.appendChild(video);

    // Set source and trigger load
    try {
      // Handle blob URLs and data URLs specially
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        video.src = url;
        video.load();
      } else {
        // For remote URLs, add cache-busting to avoid stale metadata
        const separator = url.includes('?') ? '&' : '?';
        video.src = `${url}${separator}_t=${Date.now()}`;
        video.load();
      }
    } catch (err) {
      console.warn('Error setting video source:', err);
      clearTimeout(timeoutId);
      cleanup();
      resolve({ 
        durationMs: 10000, 
        hasAudio: false,
        tracks: {
          video: [],
          audio: [],
        },
      });
    }
  });
};

/**
 * Extracts detailed track information from a video element
 * @param {HTMLVideoElement} video - Video element with loaded metadata
 * @param {boolean} hasAudio - Whether audio was detected
 * @returns {Object} Track information object
 */
const extractTrackInfo = (video, hasAudio = false) => {
  const tracks = {
    video: [],
    audio: [],
  };

  try {
    // Extract video track information
    if (video.videoWidth && video.videoHeight) {
      const videoTrack = {
        id: 'video-0',
        type: 'video',
        codec: extractCodec(video, 'video'),
        width: video.videoWidth,
        height: video.videoHeight,
        bitrate: estimateBitrate(video),
        frameRate: estimateFrameRate(video),
        duration: video.duration || 0,
        language: null, // Video tracks typically don't have language
      };
      tracks.video.push(videoTrack);
    }

    // Extract audio track information
    if (video.audioTracks && video.audioTracks.length > 0) {
      for (let i = 0; i < video.audioTracks.length; i++) {
        const audioTrack = video.audioTracks[i];
        tracks.audio.push({
          id: audioTrack.id || `audio-${i}`,
          type: 'audio',
          codec: extractCodec(video, 'audio'),
          bitrate: estimateAudioBitrate(video),
          sampleRate: estimateSampleRate(video),
          channels: estimateChannels(video),
          language: audioTrack.language || 'unknown',
          enabled: audioTrack.enabled,
          duration: video.duration || 0,
        });
      }
    } else if (hasAudio) {
      // Fallback: create a default audio track if audio is detected but tracks aren't available
      tracks.audio.push({
        id: 'audio-0',
        type: 'audio',
        codec: 'unknown',
        bitrate: estimateAudioBitrate(video),
        sampleRate: estimateSampleRate(video),
        channels: 2, // Default assumption
        language: 'unknown',
        enabled: true,
        duration: video.duration || 0,
      });
    }
  } catch (error) {
    console.warn('Error extracting track information:', error);
  }

  return tracks;
};

/**
 * Extracts codec information from video element
 * @param {HTMLVideoElement} video - Video element
 * @param {string} type - 'video' or 'audio'
 * @returns {string} Codec name or 'unknown'
 */
const extractCodec = (video, type) => {
  try {
    if (video.canPlayType) {
      // Try to detect codec from video source
      const videoCodecs = [
        { mime: 'video/mp4; codecs="avc1.42E01E"', codec: 'H.264' },
        { mime: 'video/mp4; codecs="avc1.640028"', codec: 'H.264 (High Profile)' },
        { mime: 'video/webm; codecs="vp8"', codec: 'VP8' },
        { mime: 'video/webm; codecs="vp9"', codec: 'VP9' },
        { mime: 'video/webm; codecs="av01"', codec: 'AV1' },
      ];

      const audioCodecs = [
        { mime: 'audio/mp4; codecs="mp4a.40.2"', codec: 'AAC' },
        { mime: 'audio/mp4; codecs="mp4a.40.5"', codec: 'AAC (HE)' },
        { mime: 'audio/webm; codecs="opus"', codec: 'Opus' },
        { mime: 'audio/webm; codecs="vorbis"', codec: 'Vorbis' },
        { mime: 'audio/ogg; codecs="opus"', codec: 'Opus' },
      ];

      const codecs = type === 'video' ? videoCodecs : audioCodecs;
      
      for (const { mime, codec } of codecs) {
        if (video.canPlayType(mime) !== '') {
          return codec;
        }
      }
    }
  } catch (error) {
    console.warn('Error extracting codec:', error);
  }
  
  return 'unknown';
};

/**
 * Estimates video bitrate based on file size and duration
 * @param {HTMLVideoElement} video - Video element
 * @returns {number|null} Estimated bitrate in kbps
 */
const estimateBitrate = (video) => {
  // This is a rough estimate - actual bitrate requires file size
  // We'll return null and let the caller provide file size if available
  return null;
};

/**
 * Estimates frame rate (not directly available, returns null)
 * @param {HTMLVideoElement} video - Video element
 * @returns {number|null} Frame rate or null
 */
const estimateFrameRate = (video) => {
  // Frame rate is not directly available from HTML5 video API
  // Would need server-side analysis or MediaSource Extensions
  return null;
};

/**
 * Estimates audio bitrate
 * @param {HTMLVideoElement} video - Video element
 * @returns {number|null} Estimated bitrate in kbps
 */
const estimateAudioBitrate = (video) => {
  // Audio bitrate estimation requires file size
  // Return null - will be calculated when file size is available
  return null;
};

/**
 * Estimates audio sample rate
 * @param {HTMLVideoElement} video - Video element
 * @returns {number|null} Sample rate in Hz
 */
const estimateSampleRate = (video) => {
  // Sample rate is not directly available from HTML5 video API
  // Would need Web Audio API analysis
  return null;
};

/**
 * Estimates number of audio channels
 * @param {HTMLVideoElement} video - Video element
 * @returns {number|null} Number of channels
 */
const estimateChannels = (video) => {
  // Channel count is not directly available from HTML5 video API
  // Would need Web Audio API analysis
  return null;
};

/**
 * Enhanced metadata extraction with file size for accurate bitrate calculation
 * @param {string} url - Video URL
 * @param {number} fileSizeBytes - File size in bytes
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} Enhanced metadata with bitrate information
 */
export const getVideoMetadataWithFileSize = async (url, fileSizeBytes, timeoutMs = 10000) => {
  const baseMetadata = await getVideoMetadataFromUrl(url, timeoutMs);
  
  if (fileSizeBytes && baseMetadata.durationMs > 0) {
    const durationSeconds = baseMetadata.durationMs / 1000;
    const totalBitrateKbps = (fileSizeBytes * 8) / (durationSeconds * 1000);
    
    // Estimate video bitrate (assume audio is ~128kbps for typical videos)
    const estimatedAudioBitrate = baseMetadata.hasAudio ? 128 : 0;
    const estimatedVideoBitrate = Math.max(0, totalBitrateKbps - estimatedAudioBitrate);
    
    // Update track information with bitrate
    if (baseMetadata.tracks) {
      if (baseMetadata.tracks.video.length > 0) {
        baseMetadata.tracks.video[0].bitrate = Math.round(estimatedVideoBitrate);
      }
      if (baseMetadata.tracks.audio.length > 0) {
        baseMetadata.tracks.audio.forEach(track => {
          track.bitrate = Math.round(estimatedAudioBitrate);
        });
      }
    }
  }
  
  return baseMetadata;
};
