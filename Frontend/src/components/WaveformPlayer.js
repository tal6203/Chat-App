import React, { useEffect, useState, useCallback } from 'react';
import WavesurferPlayer from '@wavesurfer/react';
import { useAudioPlayer } from '../AudioPlayerContext';
import { useDarkMode } from '../DarkModeContext';
import './WaveformPlayer.css';

const WaveformPlayer = ({ audioUrl, duration }) => {
    const [wavesurfer, setWavesurfer] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const { playingUrl, setPlayingUrl } = useAudioPlayer();

    const { isDarkMode } = useDarkMode();

    const isPlaying = playingUrl === audioUrl;

    const onReady = (ws) => {
        setWavesurfer(ws);
        if (isPlaying) {
            ws.play();
        }
    };

    useEffect(() => {
        return () => {
            wavesurfer && wavesurfer.destroy();
        };
    }, [wavesurfer]);

    const playCurrent = useCallback(() => {
        wavesurfer && wavesurfer.play();
    }, [wavesurfer]);

    const pauseCurrent = useCallback(() => {
        wavesurfer && wavesurfer.pause();
    }, [wavesurfer]);

    const onPlayPause = () => {
        if (isPlaying) {
            pauseCurrent();
            setPlayingUrl('');
        } else {
            setPlayingUrl(audioUrl);
        }
    };

    // Update the timer as the audio plays
    useEffect(() => {
        if (wavesurfer) {
            const updateTime = () => setCurrentTime(wavesurfer.getCurrentTime());
            wavesurfer.on('audioprocess', updateTime); // Updates time continuously
            wavesurfer.on('seek', updateTime); // Updates when the user seeks

            return () => {
                wavesurfer.un('audioprocess', updateTime);
                wavesurfer.un('seek', updateTime);
            };
        }
    }, [wavesurfer]);

    // Handle playback control when playingUrl changes
    useEffect(() => {
        if (wavesurfer) {
            if (playingUrl === audioUrl) {
                playCurrent();
            } else {
                pauseCurrent();
            }
        }
    }, [playingUrl, wavesurfer, audioUrl, pauseCurrent, playCurrent]);

    // Handle playback speed change
    useEffect(() => {
        if (wavesurfer) {
            wavesurfer.setPlaybackRate(playbackSpeed); // Set playback speed when it changes
        }
    }, [wavesurfer, playbackSpeed]);

    const onFinish = useCallback(() => {
        setPlayingUrl('');  // Reset the playing URL to ensure the UI reflects that playback has finished
    }, [setPlayingUrl]);

    // Format the current time and total duration for display
    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Function to cycle playback speed
    const toggleSpeed = () => {
        setPlaybackSpeed((prevSpeed) => {
            if (prevSpeed === 1) return 1.5;
            if (prevSpeed === 1.5) return 2;
            return 1; // Reset to 1x if current speed is 2x
        });
    };

    // Function to handle seeking when clicking on the waveform
    const handleSeek = (event) => {
        if (wavesurfer) {
            const boundingRect = event.currentTarget.getBoundingClientRect();
            const clickPosition = event.clientX - boundingRect.left;
            const percentage = clickPosition / boundingRect.width;
            wavesurfer.seekTo(percentage); // Seek to the percentage of the audio
        }
    };

    return (
        <>
            <div className="audio-player-container">
                <div className="playback-speed-control">
                    <button onClick={(e) => {
                        e.stopPropagation();
                        toggleSpeed();
                    }}>
                        <span>{playbackSpeed}X</span>
                    </button>
                </div>
                <button
                    className="play-pause-button-wave"
                    onClick={(e) => {
                        e.stopPropagation();
                        onPlayPause();
                    }}
                >
                    {isPlaying ? (
                        <i className="bi bi-pause-circle"></i>
                    ) : (
                        <i className="bi bi-play-circle"></i>
                    )}
                </button>
                {/* Wrapper for the waveform with click-to-seek functionality */}
                <div
                    className="waveform-container"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSeek(e);
                    }}>
                    <WavesurferPlayer
                        width={'200px'}
                        height={'20'}
                        barWidth={3}
                        barHeight={1}
                        barRadius={10}
                        barGap={2}
                        progressColor={'#2D5BFF'}
                        responsive={true}
                        waveColor={isDarkMode ? '#FFFFFF' : '#777777'}
                        cursorColor={'transparent'}
                        cursorWidth={1}
                        url={audioUrl}
                        onReady={onReady}
                        onFinish={onFinish}
                    />
                </div>
            </div>
            <div className="recording-info">
                <span className="current-time">{formatTime(currentTime)} / </span>
                <span className="recording-duration">{duration}</span>
            </div>
        </>
    );
};

export default WaveformPlayer;
