import React, { useState } from 'react';
import { observer } from 'mobx-react';
import styles from './TrackInfoPanel.module.scss';
import { ButtonWithIcon } from '../reusableComponents/ButtonWithIcon';

/**
 * TrackInfoPanel - Displays detailed track information for video/audio elements
 * Shows codec, bitrate, language, and other metadata
 */
const TrackInfoPanel = observer(({ 
  element, 
  tracks, 
  onClose,
  onTrackSwitch,
  fileSize 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!element || !tracks) {
    return null;
  }

  const formatDuration = (ms) => {
    if (!ms) return 'Unknown';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBitrate = (kbps) => {
    if (!kbps) return 'Unknown';
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${Math.round(kbps)} kbps`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  };

  const videoTracks = tracks.video || [];
  const audioTracks = tracks.audio || [];

  return (
    <div className={styles.trackInfoPanel} role="dialog" aria-label="Track Information">
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Track Information</h3>
        <ButtonWithIcon
          icon="CloseIcon"
          size={16}
          color="#FFFFFF"
          onClick={onClose}
          classNameButton={styles.closeButton}
          aria-label="Close track information panel"
        />
      </div>

      <div className={styles.panelTabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
          aria-selected={activeTab === 'overview'}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'video' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('video')}
          aria-selected={activeTab === 'video'}
          disabled={videoTracks.length === 0}
        >
          Video ({videoTracks.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'audio' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('audio')}
          aria-selected={activeTab === 'audio'}
          disabled={audioTracks.length === 0}
        >
          Audio ({audioTracks.length})
        </button>
      </div>

      <div className={styles.panelContent}>
        {activeTab === 'overview' && (
          <div className={styles.overviewSection}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>File Name:</span>
              <span className={styles.infoValue}>{element.name || 'Unknown'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Duration:</span>
              <span className={styles.infoValue}>
                {formatDuration(element.timeFrame?.end - element.timeFrame?.start)}
              </span>
            </div>
            {fileSize && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>File Size:</span>
                <span className={styles.infoValue}>{formatFileSize(fileSize)}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Video Tracks:</span>
              <span className={styles.infoValue}>{videoTracks.length}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Audio Tracks:</span>
              <span className={styles.infoValue}>{audioTracks.length}</span>
            </div>
            {videoTracks.length > 0 && (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Resolution:</span>
                  <span className={styles.infoValue}>
                    {videoTracks[0].width} × {videoTracks[0].height}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Video Codec:</span>
                  <span className={styles.infoValue}>{videoTracks[0].codec || 'Unknown'}</span>
                </div>
              </>
            )}
            {audioTracks.length > 0 && (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Audio Codec:</span>
                  <span className={styles.infoValue}>{audioTracks[0].codec || 'Unknown'}</span>
                </div>
                {audioTracks[0].bitrate && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Audio Bitrate:</span>
                    <span className={styles.infoValue}>{formatBitrate(audioTracks[0].bitrate)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'video' && (
          <div className={styles.tracksSection}>
            {videoTracks.length === 0 ? (
              <div className={styles.noTracks}>No video tracks available</div>
            ) : (
              videoTracks.map((track, index) => (
                <div key={track.id || `video-${index}`} className={styles.trackCard}>
                  <div className={styles.trackHeader}>
                    <span className={styles.trackTitle}>Video Track {index + 1}</span>
                    {track.enabled !== undefined && (
                      <span className={`${styles.trackStatus} ${track.enabled ? styles.enabled : styles.disabled}`}>
                        {track.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </div>
                  <div className={styles.trackDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Codec:</span>
                      <span className={styles.detailValue}>{track.codec || 'Unknown'}</span>
                    </div>
                    {track.width && track.height && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Resolution:</span>
                        <span className={styles.detailValue}>
                          {track.width} × {track.height}
                        </span>
                      </div>
                    )}
                    {track.bitrate && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Bitrate:</span>
                        <span className={styles.detailValue}>{formatBitrate(track.bitrate)}</span>
                      </div>
                    )}
                    {track.frameRate && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Frame Rate:</span>
                        <span className={styles.detailValue}>{track.frameRate} fps</span>
                      </div>
                    )}
                    {track.duration && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Duration:</span>
                        <span className={styles.detailValue}>{formatDuration(track.duration * 1000)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'audio' && (
          <div className={styles.tracksSection}>
            {audioTracks.length === 0 ? (
              <div className={styles.noTracks}>No audio tracks available</div>
            ) : (
              audioTracks.map((track, index) => (
                <div 
                  key={track.id || `audio-${index}`} 
                  className={`${styles.trackCard} ${track.enabled ? styles.activeTrack : ''}`}
                >
                  <div className={styles.trackHeader}>
                    <span className={styles.trackTitle}>
                      Audio Track {index + 1}
                      {track.language && track.language !== 'unknown' && (
                        <span className={styles.trackLanguage}> ({track.language})</span>
                      )}
                    </span>
                    <div className={styles.trackActions}>
                      {track.enabled !== undefined && (
                        <span className={`${styles.trackStatus} ${track.enabled ? styles.enabled : styles.disabled}`}>
                          {track.enabled ? 'Active' : 'Inactive'}
                        </span>
                      )}
                      {audioTracks.length > 1 && onTrackSwitch && (
                        <button
                          className={styles.switchButton}
                          onClick={() => onTrackSwitch(track.id)}
                          disabled={track.enabled}
                          aria-label={`Switch to audio track ${index + 1}`}
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={styles.trackDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Codec:</span>
                      <span className={styles.detailValue}>{track.codec || 'Unknown'}</span>
                    </div>
                    {track.bitrate && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Bitrate:</span>
                        <span className={styles.detailValue}>{formatBitrate(track.bitrate)}</span>
                      </div>
                    )}
                    {track.sampleRate && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Sample Rate:</span>
                        <span className={styles.detailValue}>{track.sampleRate} Hz</span>
                      </div>
                    )}
                    {track.channels && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Channels:</span>
                        <span className={styles.detailValue}>
                          {track.channels === 1 ? 'Mono' : track.channels === 2 ? 'Stereo' : `${track.channels} channels`}
                        </span>
                      </div>
                    )}
                    {track.language && track.language !== 'unknown' && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Language:</span>
                        <span className={styles.detailValue}>{track.language}</span>
                      </div>
                    )}
                    {track.duration && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Duration:</span>
                        <span className={styles.detailValue}>{formatDuration(track.duration * 1000)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default TrackInfoPanel;
