import React from "react";
import ReactPlayer from "react-player";
import { updateMusic, useMusicState } from "./musicUtils";

const MusicPlayer = ({ partyId }) => {
  const music = useMusicState(partyId);

  return (
    <div>
      {music.track && (
        <ReactPlayer url={music.track} playing={music.isPlaying} controls />
      )}
      <button onClick={() => updateMusic(partyId, music.track, !music.isPlaying)}>
        {music.isPlaying ? "Pause" : "Play"}
      </button>
    </div>
  );
};

export default MusicPlayer;
