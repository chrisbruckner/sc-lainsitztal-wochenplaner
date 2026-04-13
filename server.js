import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ICAL from 'ical.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Webcal Feed Storage - Laden aus .env oder initialisieren
let webcalFeeds = {
  'U7': process.env.WEBCAL_U7 || null,
  'U8': process.env.WEBCAL_U8 || null,
  'U10': process.env.WEBCAL_U10 || null,
  'U11': process.env.WEBCAL_U11 || null,
  'U12': process.env.WEBCAL_U12 || null,
  'U13': process.env.WEBCAL_U13 || null,
  'U14': process.env.WEBCAL_U14 || null,
  'U15': process.env.WEBCAL_U15 || null
};

// Cache für iCal-Daten
let gameCache = {};
let lastCacheTime = {};

/**
 * Parse iCalendar data and extract games for a specific date range
 */
function parseICalGames(icalData, team) {
  try {
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const events = comp.getAllSubcomponents('vevent');
    
    const games = [];
    
    events.forEach(event => {
      const summary = event.getFirstPropertyValue('summary') || '';
      const description = event.getFirstPropertyValue('description') || '';
      const location = event.getFirstPropertyValue('location') || 'Ort unbekannt';
      const dtstart = event.getFirstPropertyValue('dtstart');
      
      if (!dtstart) return;
      
      const date = dtstart.toJSDate();
      const time = date.getHours().toString().padStart(2, '0') + ':' + 
                   date.getMinutes().toString().padStart(2, '0');
      
      // Parse opponent and type from summary
      // Format: "vs Gegner" oder "@ Gegner" oder "Gegner (H)" / "Gegner (A)"
      let opponent = summary;
      let type = 'away'; // Default to away
      
      if (summary.startsWith('vs ')) {
        opponent = summary.replace('vs ', '');
        type = 'home';
      } else if (summary.startsWith('@')) {
        opponent = summary.replace('@', '').trim();
        type = 'away';
      } else if (summary.includes('(A)')) {
        opponent = summary.replace('(A)', '').trim();
        type = 'away';
      } else if (summary.includes('(H)')) {
        opponent = summary.replace('(H)', '').trim();
        type = 'home';
      }
      
      // Override type based on location - if location contains known home locations
      const homeLocations = ['St. Martin', 'Bad Großpertholz', 'Weitra', 'Lainsitztal'];
      const locationLower = location.toLowerCase();
      const isHomeLocation = homeLocations.some(loc => locationLower.includes(loc.toLowerCase()));
      if (isHomeLocation) {
        type = 'home';
      } else if (!summary.includes('(H)') && !summary.startsWith('vs ')) {
        // If not a known home location and doesn't explicitly say home, it's away
        type = 'away';
      }
      
      games.push({
        date: date.toISOString().split('T')[0],
        time: time,
        team: team,
        opponent: opponent.trim(),
        location: location,
        type: type,
        description: description
      });
    });
    
    return games;
  } catch (error) {
    console.error('Error parsing iCal:', error.message);
    return [];
  }
}

/**
 * Fetch and cache games from webcal URLs
 */
async function loadGamesFromWebcals(startDate, endDate) {
  const allGames = [];
  const now = Date.now();
  
  // Cache für 5 Minuten
  const CACHE_DURATION = 5 * 60 * 1000;
  
  for (const [team, webcalUrl] of Object.entries(webcalFeeds)) {
    if (!webcalUrl) continue;
    
    try {
      // Check cache
      if (gameCache[team] && (now - lastCacheTime[team] < CACHE_DURATION)) {
        allGames.push(...gameCache[team]);
        continue;
      }
      
      // Fetch from webcal with detailed error logging
      console.log(`🔄 Fetching webcal for ${team}...`);
      const response = await axios.get(webcalUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.data) {
        console.warn(`⚠ Empty response from webcal for ${team}`);
        continue;
      }
      
      const games = parseICalGames(response.data, team);
      gameCache[team] = games;
      lastCacheTime[team] = now;
      
      allGames.push(...games);
      console.log(`✓ Loaded ${games.length} games for ${team} from webcal`);
    } catch (error) {
      console.error(`❌ ERROR fetching webcal for ${team}:`);
      console.error(`   URL: ${webcalUrl}`);
      console.error(`   Error: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Response: ${error.response.data?.substring?.(0, 200) || 'N/A'}`);
      }
    }
  }
  
  return allGames;
}

/**
 * GET /api/games - Fetch games for a date range
 */
app.get('/api/games', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log(`📌 API Request: /api/games (startDate: ${startDate}, endDate: ${endDate})`);
    
    // Load from webcals
    const games = await loadGamesFromWebcals(startDate, endDate);
    
    console.log(`📊 Total games loaded: ${games.length}`);
    
    // Convert to frontend format
    const formattedGames = games.map(g => {
      const date = new Date(g.date + 'T' + g.time);
      const weekNumber = getWeekNumber(date);
      const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Mo=0, So=6
      
      return {
        id: `${g.team}-${g.date}-${g.time}`,
        wo: 0, // Current week, adjusted by frontend
        date: g.date,
        time: g.time,
        team: g.team,
        opponent: g.opponent,
        location: g.location,
        type: g.type,
        description: g.description
      };
    });
    
    console.log(`✅ Returning ${formattedGames.length} games to frontend`);
    
    res.json({
      success: true,
      count: formattedGames.length,
      games: formattedGames,
      source: 'webcal',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper: Calculate week number
 */
function getWeekNumber(d) {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1);
  return Math.floor((d - start) / (7 * 86400000)) + 1;
}

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 SC Lainsitztal Wochenplaner laeuft auf http://localhost:${PORT}`);
  console.log(`📋 Frontend verfuegbar unter http://localhost:${PORT}`);
  
  // Log Webcal Status
  const configuredTeams = Object.entries(webcalFeeds)
    .filter(([_, url]) => url)
    .map(([team, _]) => team);
  
  if (configuredTeams.length > 0) {
    console.log(`✅ Webcal Feeds konfiguriert: ${configuredTeams.join(', ')}`);
  } else {
    console.log(`⚠️  Keine Webcal URLs in .env konfiguriert`);
  }
});
