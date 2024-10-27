.audio-player-container {
    display: flex;
    align-items: center; /* Center vertically */
    gap: 5px; /* Gap between play button, waveform, and duration */
    width: 100%;
  }

  .waveform-container {
    cursor: pointer; /* Indicate that it's clickable */
    display: inline-block;
}
  
   
  .play-pause-button-wave {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 24px;
    color: #4a90e2;
    transition: color 0.3s;
    display: flex;
    align-items: center; /* Center icon vertically */
  }
  
  .play-pause-button-wave:hover {
    color: #357abd;
  }
  
  .recording-duration {
    font-size: 14px;
    white-space: nowrap; 
  }

  .current-time {
    font-size: 14px;
    white-space: nowrap;
  }

  .playback-speed-control button {
    padding: 3px 10px; /* Reduced padding for smaller size */
    font-size: 12px;   /* Smaller font size */
    border: none;
    background-color: hsla(120, 14%, 10%, 0.8);
    color: white;
    cursor: pointer;
    border-radius: 15px; /* Slightly smaller border radius */
}


@media (min-width: 768px) {
    .playback-speed-control button {
        padding: 5px 15px; /* Increase padding */
        font-size: 14px;    /* Slightly larger font size */
        border-radius: 20px; /* Increase border radius */
    }
}

/* Smaller screens (like phones) */
@media (max-width: 480px) {
    .playback-speed-control button {
        padding: 2px 8px;  /* Decrease padding */
        font-size: 10px;    /* Smaller font size */
        border-radius: 12px; /* Smaller border radius */
    }
}


@media (max-width: 768px) {
  .play-pause-button-wave {
    font-size: 20px; /* Reduce size on smaller screens */
  }
}

@media (max-width: 480px) {
  .play-pause-button-wave {
    font-size: 18px; /* Further reduce size on very small screens */
  }
}
  
