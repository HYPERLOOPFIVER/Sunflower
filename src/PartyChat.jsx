import React, { useState } from 'react';

const SongSearch = () => {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [error, setError] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);

  const searchSongs = async () => {
    const apiKey = 'bppF_e8YwOcViNo3-vIDr'; // Replace with your API key
    const apiUrl = `https://osdb-api.confidence.sh/graphql/${apiKey}/`;

    const graphqlQuery = {
      query: `
        query SearchSong($query: String!, $limit: Int!) {
          searchSong(input: {query: $query, limit: $limit}) {
            id
            name
            duration
            url
          }
        }
      `,
      variables: {
        query: query,
        limit: 5,
      },
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      // Check for GraphQL errors
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setSongs(result.data.searchSong);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching songs:', err);
    }
  };

  const playSong = (songUrl) => {
    setCurrentSong(songUrl);
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
            <button onClick={() => playSong(song.url)}>Play</button>
          </li>
        ))}
      </ul>

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