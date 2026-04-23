// Yacine Anime Service - Fixed to use free Jikan API
import express from 'express';
const router = express.Router();

// Search anime by name
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) return res.json({ results: [] });
    
    const url = `https://api.jikan.moe/v4/anime?query=${encodeURIComponent(query)}&limit=25`;
    const request = new (require('urllib')).default.Request(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json();
    
    const results = data.data?.map(anime => ({
      id: anime.mal_id,
      title: anime.title,
      image: anime.images?.jpg?.image_url,
      score: anime.score,
      status: anime.status,
      episodes: anime.episodes,
      aired: anime.aired?.string,
      synopsis: anime.synopsis
    })) || [];
    
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get anime details
router.get('/details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `https://api.jikan.moe/v4/anime/${id}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json();
    
    res.json({
      id: data.data.mal_id,
      title: data.data.title,
      image: data.data.images?.jpg?.large_image_url,
      score: data.data.score,
      status: data.data.status,
      episodes: data.data.episodes,
      aired: data.data.aired?.string,
      synopsis: data.data.synopsis,
      genres: data.data.genres?.map(g => g.name),
      studios: data.data.studios?.map(s => s.name),
      season: data.data.season,
      year: data.data.year,
      rating: data.data.rating,
      source: data.data.source
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
