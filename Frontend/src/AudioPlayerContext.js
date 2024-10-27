import React, { createContext, useContext, useState } from 'react';

// Create a context for the audio player
const AudioPlayerContext = createContext({
    playingUrl: '',
    setPlayingUrl: () => {}
});

// Context Provider Component
export const AudioPlayerProvider = ({ children }) => {
    const [playingUrl, setPlayingUrl] = useState('');

    return (
        <AudioPlayerContext.Provider value={{ playingUrl, setPlayingUrl }}>
            {children}
        </AudioPlayerContext.Provider>
    );
};

// Custom hook to use the audio player context
export const useAudioPlayer = () => useContext(AudioPlayerContext);
