const TEAMS = ['U7', 'U8', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15'];
const DAYS_S = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DAYS_F = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

let weekOffset = 0;
let games = [];
let nextId = 1;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  loadGames();
  render();
  
  // Try to fetch from webcals on initial load
  try {
    await syncWebcalGames(true);
  } catch (err) {
    console.log('Webcal nicht verfügbar, verwende gespeicherte Daten');
  }
});

// Local Storage Management
function saveGames() {
  localStorage.setItem('scl_games', JSON.stringify(games));
}

function loadGames() {
  const saved = localStorage.getItem('scl_games');
  if (saved) {
    try {
      games = JSON.parse(saved);
      nextId = Math.max(...games.map(g => g.id || 0), 0) + 1;
    } catch (e) {
      console.error('Fehler beim Laden der Spiele:', e);
      games = [];
    }
  }
}

// Utility Functions
function getMonday(offset) {
  const base = new Date();
  const d = base.getDay();
  const diff = d === 0 ? -6 : 1 - d;
  const mon = new Date(base);
  mon.setDate(base.getDate() + diff + offset * 7);
  return mon;
}

function getWeekDates(offset) {
  const mon = getMonday(offset);
  return Array.from({length: 7}, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function getKW(d) {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1);
  return Math.floor((d - start) / (7 * 86400000)) + 1;
}

function fmt(d) {
  return d.getDate() + '.' + (d.getMonth() + 1) + '.';
}

function isToday(d) {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth();
}

function showFeedback(msg, isError = false) {
  const el = document.getElementById('feedback');
  el.textContent = msg;
  el.classList.add('show');
  el.classList.toggle('error', isError);
  setTimeout(() => {
    el.classList.remove('show');
  }, 4000);
}

// Rendering
function render() {
  const dates = getWeekDates(weekOffset);
  const kw = getKW(dates[0]);
  const kwStr = 'KW ' + kw;
  const dateRange = fmt(dates[0]) + ' – ' + fmt(dates[6]) + ' ' + dates[0].getFullYear();

  document.getElementById('kwBadge').textContent = kwStr;
  document.getElementById('weekDatesBig').textContent = dateRange;
  document.getElementById('weekInfo').textContent = kwStr + '  ' + dateRange;

  const grid = document.getElementById('mainGrid');
  grid.innerHTML = '';

  // Corner cell
  const corner = document.createElement('div');
  grid.appendChild(corner);

  // Day headers
  dates.forEach((d, i) => {
    const h = document.createElement('div');
    h.className = 'col-head' + (isToday(d) ? ' today' : '');
    h.innerHTML = '<div class="dn">' + DAYS_S[i] + '</div><div class="dd">' + fmt(d) + '</div>';
    grid.appendChild(h);
  });

  // Rows
  TEAMS.forEach(team => {
    const lbl = document.createElement('div');
    lbl.className = 'row-lbl';
    lbl.textContent = team;
    grid.appendChild(lbl);

    dates.forEach((d, di) => {
      const cell = document.createElement('div');
      cell.className = 'cell' + (isToday(d) ? ' today' : '');
      
      // Find games for this cell
      const gameList = games.filter(g => g.wo === weekOffset && g.team === team && g.day === di);
      gameList.forEach(g => {
        const el = document.createElement('div');
        el.className = 'game ' + g.type;
        el.innerHTML = '<div class="gt">' + g.time + '</div><div class="go">' + g.opp + '</div><div class="gl">' + (g.type === 'home' ? '⌂' : '→') + ' ' + g.loc + '</div><span class="del" onclick="delGame(' + g.id + ',event)">✕</span>';
        cell.appendChild(el);
      });
      
      grid.appendChild(cell);
    });
  });

  const cnt = games.filter(g => g.wo === weekOffset).length;
  document.getElementById('gameTotal').innerHTML = 'Gesamt: <span>' + cnt + '</span> Spiel' + (cnt !== 1 ? 'e' : '');
}

// Game Management
function changeWeek(d) {
  weekOffset += d;
  render();
}

function addGame() {
  const team = document.getElementById('fTeam').value;
  const day = parseInt(document.getElementById('fDay').value);
  const time = document.getElementById('fTime').value;
  const opp = document.getElementById('fOpp').value || 'Gegner';
  const loc = document.getElementById('fLoc').value || 'Sportplatz';
  const type = document.getElementById('fType').value;

  if (!time || !opp || !loc) {
    showFeedback('⚠ Alle Felder ausfüllen!', true);
    return;
  }

  games.push({
    id: nextId++,
    wo: weekOffset,
    team,
    day,
    time,
    opp,
    loc,
    type
  });

  saveGames();
  render();
  
  // Clear inputs
  document.getElementById('fOpp').value = '';
  document.getElementById('fLoc').value = '';
  document.getElementById('fTime').value = '10:00';
  
  showFeedback('✓ Spiel hinzugefügt!');
}

function delGame(id, e) {
  e.stopPropagation();
  games = games.filter(g => g.id !== id);
  saveGames();
  render();
  showFeedback('✓ Spiel gelöscht!');
}

// Export to Image
function exportPoster() {
  const btn = document.querySelector('.btn-export');
  btn.textContent = '⏳ Erstelle Bild…';
  btn.disabled = true;

  // Hide delete buttons
  document.querySelectorAll('.del').forEach(d => d.style.visibility = 'hidden');

  const poster = document.getElementById('poster');
  const dates = getWeekDates(weekOffset);
  const kw = getKW(dates[0]);
  const kwStr = 'KW' + kw;

  // Use html2canvas if available
  if (typeof html2canvas !== 'undefined') {
    html2canvas(poster, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f2a16',
      allowTaint: true,
      logging: false,
      width: 1080,
      windowHeight: poster.scrollHeight
    }).then(canvas => {
      downloadImage(canvas, kwStr, btn);
    }).catch(err => {
      console.error('Export error:', err);
      showFeedback('❌ Fehler beim Export', true);
      resetExportBtn(btn);
    });
  } else {
    showFeedback('❌ html2canvas nicht verfügbar', true);
    resetExportBtn(btn);
  }
}


function downloadImage(canvas, kwStr, btn) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SCL_Wochenplan_${kwStr}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    resetExportBtn(btn);
    showFeedback('✓ Bild gespeichert!');
  });
}

function resetExportBtn(btn) {
  btn.textContent = '⬇ Als Bild speichern';
  btn.disabled = false;
  document.querySelectorAll('.del').forEach(d => d.style.visibility = 'visible');
}

/**
 * Add Game Form Functions
 */

function toggleAddForm() {
  const modal = document.getElementById('addGameModal');
  if (modal) {
    modal.classList.toggle('open');
  }
}

function addGame() {
  const team = document.getElementById('formTeam').value;
  const dateStr = document.getElementById('formDate').value;
  const timeStr = document.getElementById('formTime').value;
  const opponent = document.getElementById('formOpponent').value;
  const location = document.getElementById('formLocation').value;

  if (!dateStr || !timeStr || !opponent || !location) {
    showFeedback('❌ Alle Felder ausfüllen!', true);
    return;
  }

  // Determine type based on location
  const homeLocations = ['St. Martin', 'Bad Großpertholz', 'Weitra', 'Lainsitztal'];
  const locationLower = location.toLowerCase();
  const isHomeLocation = homeLocations.some(loc => locationLower.includes(loc.toLowerCase()));
  const type = isHomeLocation ? 'home' : 'away';

  // Create game object
  const game = {
    id: nextId++,
    wo: calculateWeekOffset(new Date(dateStr)),
    team: team,
    day: new Date(dateStr).getDay() === 0 ? 6 : new Date(dateStr).getDay() - 1,
    time: timeStr,
    opp: opponent,
    loc: location,
    type: type
  };

  // Add game
  games.push(game);
  saveGames();
  render();
  
  // Reset form
  document.getElementById('formTeam').value = 'U7';
  document.getElementById('formDate').value = '';
  document.getElementById('formTime').value = '';
  document.getElementById('formOpponent').value = '';
  document.getElementById('formLocation').value = '';
  
  toggleAddForm();
  showFeedback(`✓ Spiel für ${team} hinzugefügt!`);
}

/**
 * Webcal Management Functions
 */

async function loadWebcalGames() {
  try {
    const response = await fetch('/api/games');
    if (response.ok) {
      const data = await response.json();
      if (data.games && data.games.length > 0) {
        // Merge with existing games
        const newGames = data.games.map(g => {
          const gameDate = new Date(g.date + 'T00:00:00');
          return {
            id: g.id,
            wo: calculateWeekOffset(gameDate),
            team: g.team,
            day: gameDate.getDay() === 0 ? 6 : gameDate.getDay() - 1,
            time: g.time,
            opp: g.opponent,
            loc: g.location,
            type: g.type
          };
        });
        
        // Remove old webcal games (webcal games haben String IDs mit '-')
        games = games.filter(g => typeof g.id !== 'string' || !g.id.includes('-'));
        
        // Add new games
        games.push(...newGames);
        saveGames();
        render();
        showFeedback(`✓ ${data.count} Spiele von Webcal geladen!`);
      }
    }
  } catch (err) {
    console.log('Webcal API nicht verfügbar:', err);
  }
}

// Neue Sync-Funktion mit Feedback
async function syncWebcalGames(isAutoSync = false) {
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn && !isAutoSync) {
    syncBtn.textContent = '⏳ Synchronisiere...';
    syncBtn.disabled = true;
  }

  try {
    console.log('🔄 Syncing games from /api/games endpoint...');
    const response = await fetch('/api/games');
    
    console.log('📋 Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 API Response:', data);
    
    if (data.games && data.games.length > 0) {
      // Merge with existing games
      const newGames = data.games.map(g => {
        const gameDate = new Date(g.date + 'T00:00:00');
        return {
          id: g.id,
          wo: calculateWeekOffset(gameDate),
          team: g.team,
          day: gameDate.getDay() === 0 ? 6 : gameDate.getDay() - 1,
          time: g.time,
          opp: g.opponent,
          loc: g.location,
          type: g.type
        };
      });
      
      // Remove old webcal games (webcal games haben String IDs mit '-')
      games = games.filter(g => typeof g.id !== 'string' || !g.id.includes('-'));
      
      // Add new games
      games.push(...newGames);
      saveGames();
      render();
      if (!isAutoSync) {
        showFeedback(`✓ ${data.count} Spiele synchronisiert!`);
      }
      console.log(`✅ Successfully synced ${data.count} games`);
    } else {
      console.warn('⚠️ No games received from API:', data);
      if (!isAutoSync) {
        showFeedback('ℹ Keine Spiele in Webcals gefunden (Server antwortet korrekt, aber Webcal-URLs liefern keine Daten)', false);
      }
    }
  } catch (err) {
    console.error('❌ Sync Error:', err);
    if (!isAutoSync) {
      showFeedback(`❌ Sync Fehler: ${err.message}`, true);
    }
  } finally {
    if (syncBtn && !isAutoSync) {
      syncBtn.textContent = '🔄 Spiele aktualisieren';
      syncBtn.disabled = false;
    }
  }
}

function calculateWeekOffset(date) {
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  
  const gameMonday = new Date(date);
  const gameDay = gameMonday.getDay();
  const gameDiff = gameMonday.getDate() - gameDay + (gameDay === 0 ? -6 : 1);
  gameMonday.setDate(gameDiff);
  
  const weeks = Math.round((gameMonday - monday) / (7 * 24 * 60 * 60 * 1000));
  return weeks;
}
