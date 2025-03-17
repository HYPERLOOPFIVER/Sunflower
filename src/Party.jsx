import React, { useState } from 'react';

const SongSearch = () => {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [error, setError] = useState(null);
  const [currentSong, setCurrentSong] = useState(null); // Track the currently playing song

  const searchSongs = async () => {
    const apiKey = 'bppF_e8YwOcViNo3-vIDr'; // Replace with your API key
    const apiUrl = `https://osdb-api.confidence.sh/graphql/${apiKey}/`;

    const graphqlQuery = {
      query: `
        query {
          searchSong(input: {query: "${query}", limit: 5}) {
            id
            name
            duration
            url // Assuming the API returns a URL for the song
          }
        }
      `,
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphqlQuery),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch songs');
      }

      const result = await response.json();
      setSongs(result.data.searchSong); // Assuming the API returns data in this structure
    } catch (err) {
      setError(err.message);
    }
  };

  const playSong = (songUrl) => {
    setCurrentSong(songUrl); // Set the current song URL for playback
  };

  return (
    <div>
      <h1>Song Search</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter song name"
      />
      <button onClick={searchSongs}>Search</button>

      {error && <p>Error: {error}</p>}

      <ul>
        {songs.map((song) => (
          <li key={song.id}>
            <strong>{song.name}</strong> - {song.duration}
            <button onClick={() => playSong(song.url)}>Play</button> {/* Add a play button */}
          </li>
        ))}
      </ul>

      {/* Audio Player */}
      {currentSong && (
        <div>
          <h2>Now Playing</h2>
          <audio controls autoPlay>
            <source src={currentSong} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default SongSearch;