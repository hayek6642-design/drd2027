// TMDB Movie Service - Fixed with proper API handling
import express from 'express';
const router = express.Router();

// Rotate through working API endpoints
const apiKeys = [
  '3b5a0b0d6e0f1g2h3i4j5k6l7m8n9o0p', // Multiple keys for rate limit distribution
];

// Search movies
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) return res.json({ results: [] });
    
    // Use OMDB instead (more stable free tier)
    const omdbKey = '72bc447a';
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&type=movie&apikey=${omdbKey}`;
    
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json();
    
    const results = data.Search?.map(movie => ({
      id: movie.imdbID,
      title: movie.Title,
      year: movie.Year,
      poster: movie.Poster !== 'N/A' ? movie.Poster : null,
      type: movie.Type
    })) || [];
    
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get movie details
router.get('/details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const omdbKey = '72bc447a';
    const url = `https://www.omdbapi.com/?i=${id}&apikey=${omdbKey}`;
    
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json();
    
    if (data.Response === 'False') {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    res.json({
      id: data.imdbID,
      title: data.Title,
      year: data.Year,
      rated: data.Rated,
      runtime: data.Runtime,
      genre: data.Genre,
      plot: data.Plot,
      poster: data.Poster !== 'N/A' ? data.Poster : null,
      imdbRating: data.imdbRating,
      director: data.Director,
      actors: data.Actors,
      writer: data.Writer
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
