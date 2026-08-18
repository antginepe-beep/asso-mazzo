const MAX_HISTORY = 5;
const STORAGE_KEY = 'asso-mazzo-global-stats';
const state = {
  matchHistory: [],
  currentGame: null,
  globalStats: {},
  statsViewVisible: false,
};

export function loadGlobalStats() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveGlobalStats(stats) {
  if (typeof window === 'undefined') {
    return stats;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

export function resetGlobalStats() {
  state.globalStats = {};
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return state.globalStats;
}

export function mergeGlobalStats(stats = {}, players = [], winnerName = null) {
  const nextStats = { ...stats };

  players.forEach((player) => {
    const playerName = player.name;
    const existing = nextStats[playerName] ?? {
      name: playerName,
      matches: 0,
      wins: 0,
      handsPlayed: 0,
      totalPoints: 0,
      voloCount: 0,
    };

    existing.matches += 1;
    existing.handsPlayed += Array.isArray(player.handScores) ? player.handScores.length : 0;
    existing.totalPoints += Number(player.total) || 0;
    existing.voloCount += Number(player.voloCount) || 0;

    if (winnerName && playerName === winnerName) {
      existing.wins += 1;
    }

    nextStats[playerName] = existing;
  });

  return nextStats;
}

state.globalStats = loadGlobalStats();

const PLAYER_COUNT_INPUT = typeof document !== 'undefined' ? document.getElementById('player-count') : null;
const PLAYER_INPUTS_CONTAINER = typeof document !== 'undefined' ? document.getElementById('player-inputs') : null;
const FIRST_DEALER_SELECT = typeof document !== 'undefined' ? document.getElementById('first-dealer') : null;
const TARGET_POINTS_SELECT = typeof document !== 'undefined' ? document.getElementById('target-points') : null;
const SETUP_FORM = typeof document !== 'undefined' ? document.getElementById('setup-form') : null;
const GAME_SCREEN = typeof document !== 'undefined' ? document.getElementById('game-screen') : null;
const SETUP_SCREEN = typeof document !== 'undefined' ? document.getElementById('setup-screen') : null;
const HAND_FORM = typeof document !== 'undefined' ? document.getElementById('hand-form') : null;
const CLASSIFICATION_CONTAINER = typeof document !== 'undefined' ? document.getElementById('classification') : null;
const PLAYER_STATS_CONTAINER = typeof document !== 'undefined' ? document.getElementById('player-stats') : null;
const DEALER_DISPLAY = typeof document !== 'undefined' ? document.getElementById('dealer-display') : null;
const ROUND_DISPLAY = typeof document !== 'undefined' ? document.getElementById('round-display') : null;
const TARGET_DISPLAY = typeof document !== 'undefined' ? document.getElementById('target-display') : null;
const WINNER_BANNER = typeof document !== 'undefined' ? document.getElementById('winner-banner') : null;
const NEW_MATCH_BUTTON = typeof document !== 'undefined' ? document.getElementById('new-match-button') : null;
const ADVANCE_TURN_BUTTON = typeof document !== 'undefined' ? document.getElementById('advance-turn') : null;
const STATS_TOGGLE_BUTTON = typeof document !== 'undefined' ? document.getElementById('stats-toggle-button') : null;
const STATS_SCREEN = typeof document !== 'undefined' ? document.getElementById('stats-screen') : null;
const GLOBAL_STATS_CONTENT = typeof document !== 'undefined' ? document.getElementById('global-stats-content') : null;
const RESET_STATS_BUTTON = typeof document !== 'undefined' ? document.getElementById('reset-stats-button') : null;
const STATS_BACK_BUTTON = typeof document !== 'undefined' ? document.getElementById('stats-back-button') : null;

export function buildPlayers(names) {
  return names.map((name, index) => ({
    id: index,
    name: name.trim(),
    total: 0,
    handScores: [],
    voloCount: 0,
  }));
}

export function rotateDealer(currentIndex, playerCount) {
  if (playerCount <= 0) {
    return 0;
  }

  return (currentIndex + 1) % playerCount;
}

export function createGame({ playerNames, targetPoints = 151, firstDealerIndex = 0 }) {
  return {
    targetPoints,
    players: buildPlayers(playerNames),
    dealerIndex: firstDealerIndex,
    roundNumber: 1,
    isFinished: false,
    winner: null,
    winners: [],
    loser: null,
    voloPlayerIndex: null,
  };
}

export function getWinningSlots(playerCount) {
  return Math.max(1, playerCount - 2);
}

export function getWinners(players, loserName = null) {
  const sortedPlayers = [...players].sort((left, right) => left.total - right.total);
  const candidates = loserName ? sortedPlayers.filter((player) => player.name !== loserName) : sortedPlayers;
  return candidates.slice(0, getWinningSlots(players.length));
}

export function calculateWinner(players, loserName = null) {
  const winners = getWinners(players, loserName);
  return winners[0] ?? null;
}

export function getWinProbability(playerName, matchHistory) {
  const recentHistory = matchHistory.slice(-MAX_HISTORY);
  const wins = recentHistory.filter((winnerName) => winnerName === playerName).length;
  const denominator = recentHistory.length > 0 ? recentHistory.length : 1;
  return Math.round((wins / denominator) * 100);
}

export function computeLeaderboard(players, matchHistory = []) {
  return players
    .map((player) => ({
      ...player,
      averagePoints: player.handScores.length ? player.total / player.handScores.length : 0,
      winProbability: getWinProbability(player.name, matchHistory),
      handsPlayed: player.handScores.length,
    }))
    .sort((left, right) => {
      if (left.total !== right.total) {
        return left.total - right.total;
      }
      return left.name.localeCompare(right.name);
    });
}

export function getPlayerStats(players, matchHistory = []) {
  return players
    .map((player) => {
      const handsPlayed = player.handScores.length;
      const averagePoints = handsPlayed ? player.total / handsPlayed : 0;
      return {
        ...player,
        averagePoints,
        handsPlayed,
        winProbability: getWinProbability(player.name, matchHistory),
      };
    })
    .sort((left, right) => right.total - left.total);
}

export function applyHandToGame(game, handScores) {
  const normalizedScores = handScores.map((score) => Number(score) || 0);

  if (normalizedScores.length !== game.players.length) {
    throw new Error('Il numero di punteggi deve corrispondere al numero di giocatori.');
  }

  game.players.forEach((player, index) => {
    const score = normalizedScores[index];
    player.total += score;
    player.handScores.push(score);
  });

  const loser = game.players.find((player) => player.total >= game.targetPoints) ?? null;

  if (loser) {
    const winners = getWinners(game.players, loser.name);
    game.isFinished = true;
    game.loser = loser.name;
    game.winners = winners.map((player) => player.name);
    game.winner = winners[0]?.name ?? null;
    return game;
  }

  game.dealerIndex = rotateDealer(game.dealerIndex, game.players.length);
  game.roundNumber += 1;
  return game;
}

function renderPlayerInputs() {
  if (!PLAYER_COUNT_INPUT || !PLAYER_INPUTS_CONTAINER || !FIRST_DEALER_SELECT) {
    return;
  }

  const playerCount = Number(PLAYER_COUNT_INPUT.value) || 2;
  const currentNames = Array.from(PLAYER_INPUTS_CONTAINER.querySelectorAll('input')).map((input) => input.value);
  const safeNames = currentNames.length ? currentNames : Array.from({ length: playerCount }, (_, index) => `Giocatore ${index + 1}`);

  PLAYER_INPUTS_CONTAINER.innerHTML = Array.from({ length: playerCount }, (_, index) => {
    const value = safeNames[index] || `Giocatore ${index + 1}`;
    return `
      <label>
        Nome giocatore ${index + 1}
        <input type="text" class="player-name-input" value="${value}" maxlength="20" />
      </label>
    `;
  }).join('');

  populateDealerOptions();
}

function populateDealerOptions() {
  if (!PLAYER_INPUTS_CONTAINER || !FIRST_DEALER_SELECT) {
    return;
  }

  const playerNames = Array.from(PLAYER_INPUTS_CONTAINER.querySelectorAll('.player-name-input')).map((input) => input.value.trim() || 'Giocatore');
  const dealerOptions = playerNames
    .map((name, index) => `<option value="${index}">${name}</option>`)
    .join('');

  FIRST_DEALER_SELECT.innerHTML = dealerOptions;
  FIRST_DEALER_SELECT.value = String(Math.min(Number(FIRST_DEALER_SELECT.value) || 0, playerNames.length - 1));
}

function openGame() {
  const players = Array.from(PLAYER_INPUTS_CONTAINER.querySelectorAll('.player-name-input'))
    .map((input) => input.value.trim())
    .filter(Boolean);

  if (players.length < 2) {
    return;
  }

  const targetPoints = Number(TARGET_POINTS_SELECT.value) || 3;
  const firstDealerIndex = Number(FIRST_DEALER_SELECT.value) || 0;

  state.currentGame = createGame({
    playerNames: players,
    targetPoints,
    firstDealerIndex,
  });

  SETUP_SCREEN.hidden = true;
  GAME_SCREEN.hidden = false;
  NEW_MATCH_BUTTON.hidden = false;
  renderGameBoard();
}

function renderGameBoard() {
  const game = state.currentGame;
  if (!game) {
    return;
  }

  if (!TARGET_DISPLAY || !DEALER_DISPLAY || !ROUND_DISPLAY || !HAND_FORM || !CLASSIFICATION_CONTAINER || !WINNER_BANNER || !PLAYER_STATS_CONTAINER) {
    return;
  }

  TARGET_DISPLAY.textContent = String(game.targetPoints);
  DEALER_DISPLAY.textContent = game.players[game.dealerIndex]?.name ?? '-';
  ROUND_DISPLAY.textContent = String(game.roundNumber);

  if (game.isFinished && game.winner) {
    const sortedPlayers = computeLeaderboard(game.players, state.matchHistory);
    const winnerNames = game.winners.length ? game.winners : [game.winner];
    const winnerText = winnerNames.join(', ');
    const loserText = game.loser ? ` • ${game.loser} perde a ${game.players.find((player) => player.name === game.loser)?.total ?? 0} punti` : '';
    const firstWinner = sortedPlayers.find((player) => player.name === winnerNames[0]) ?? sortedPlayers[0];
    WINNER_BANNER.hidden = false;
    WINNER_BANNER.textContent = `Partita terminata: ${winnerText} vincono con ${firstWinner.total} punti.${loserText}`;
  } else {
    WINNER_BANNER.hidden = true;
  }

  HAND_FORM.innerHTML = game.players
    .map((player, index) => {
      const currentTotal = game.players[index].total;
      return `
        <div class="hand-row">
          <div>
            <strong>${player.name}</strong>
            <span class="small-total">Totale: ${currentTotal} punti</span>
          </div>
          <div class="hand-controls">
            <div class="score-input-wrapper">
              <button class="score-btn minus" data-player-index="${index}" type="button">−</button>
              <input type="number" min="-21" max="21" step="1" value="0" data-player-index="${index}" data-volo="false" />
              <button class="score-btn plus" data-player-index="${index}" type="button">+</button>
            </div>
            <button class="volo-btn" data-player-index="${index}" type="button" title="Volo -21 punti">✈️ Volo</button>
          </div>
        </div>
      `;
    })
    .join('');

  const leaderboard = computeLeaderboard(game.players, state.matchHistory);
  CLASSIFICATION_CONTAINER.innerHTML = leaderboard
    .map((player, index) => {
      const leaderTag = index === 0 ? ' <span>●</span>' : '';
      return `
        <div class="rank-card ${index === 0 ? 'is-leader' : ''}">
          <div class="rank-head">
            <strong>#${index + 1} ${player.name}${leaderTag}</strong>
            <span>${player.total} pt</span>
          </div>
          <div class="rank-meta">
            <span>Media: ${player.averagePoints.toFixed(1)}</span>
            <span>Prob. vittoria (5): ${player.winProbability}%</span>
          </div>
        </div>
      `;
    })
    .join('');

  const stats = getPlayerStats(game.players, state.matchHistory);
  const recentHistory = state.matchHistory.length
    ? state.matchHistory
        .slice()
        .reverse()
        .map((winner, index) => `<li><span>#${state.matchHistory.length - index}</span><strong>${winner}</strong></li>`)
        .join('')
    : '<li class="empty-history">Nessuna partita recente</li>';

  PLAYER_STATS_CONTAINER.innerHTML = `
    <div class="stats-header">
      <h3>Statistiche</h3>
    </div>
    <div class="stats-grid">
      ${stats
        .map((player) => `
          <article class="stat-card">
            <span class="stat-label">${player.name}</span>
            <strong>${player.total} pt</strong>
            <small>Media: ${player.averagePoints.toFixed(1)} • Mani: ${player.handsPlayed} • Volo: ${player.voloCount}</small>
          </article>
        `)
        .join('')}
    </div>
    <div class="history-panel">
      <h4>Storico recenti</h4>
      <ul class="history-list">${recentHistory}</ul>
    </div>
  `;

  renderGlobalStats();

  if (HAND_FORM) {
    HAND_FORM.querySelectorAll('.score-btn').forEach(button => {
      button.addEventListener('click', handleScoreButtonClick);
    });
    HAND_FORM.querySelectorAll('.volo-btn').forEach(button => {
      button.addEventListener('click', handleVoloButtonClick);
    });
    HAND_FORM.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('input', handleManualScoreInput);
    });
  }

  updateHandTotal();
}

function getHandScoresFromForm() {
  if (!HAND_FORM) {
    return { scores: [], voloPlayerIndex: null };
  }

  const inputs = Array.from(HAND_FORM.querySelectorAll('input[type="number"]'));
  const voloPlayerIndex = inputs.findIndex((input) => input.dataset.volo === 'true');

  if (voloPlayerIndex === -1) {
    const scores = inputs.map((input) => Number(input.value) || 0);
    return { scores, voloPlayerIndex };
  }

  const scores = inputs.map((input, index) => (index === voloPlayerIndex ? -21 : 0));
  return { scores, voloPlayerIndex };
}

function completeHand() {
  if (!state.currentGame || state.currentGame.isFinished || !HAND_FORM) {
    return;
  }

  const { scores, voloPlayerIndex } = getHandScoresFromForm();

  if (voloPlayerIndex !== -1) {
    const isValidVolo = scores[voloPlayerIndex] === -21 && scores.every((score, index) => index === voloPlayerIndex ? score === -21 : score === 0);
    if (!isValidVolo) {
      alert('❌ Il volo è valido solo se un giocatore prende -21 e gli altri restano a 0.');
      return;
    }
    state.currentGame.players[voloPlayerIndex].voloCount += 1;
  } else {
    const total = scores.reduce((sum, score) => sum + Number(score), 0);
    if (total !== 21) {
      alert(`❌ Errore! Il totale deve essere esattamente 21 punti.\nAttualmente: ${total} punti`);
      return;
    }
  }

  const nextGame = applyHandToGame(state.currentGame, scores);
  state.currentGame = nextGame;

  if (nextGame.isFinished && nextGame.winners.length) {
    state.matchHistory.push(...nextGame.winners);
    if (state.matchHistory.length > MAX_HISTORY) {
      state.matchHistory = state.matchHistory.slice(-MAX_HISTORY);
    }

    state.globalStats = mergeGlobalStats(state.globalStats, nextGame.players, nextGame.winner);
    saveGlobalStats(state.globalStats);
  }

  renderGameBoard();
}

function updateHandTotal() {
  if (!HAND_FORM || !ADVANCE_TURN_BUTTON) return;

  const inputs = Array.from(HAND_FORM.querySelectorAll('input[type="number"]'));
  const voloIndex = inputs.findIndex((input) => input.dataset.volo === 'true');

  if (voloIndex !== -1) {
    const othersAreZero = inputs.every((input, index) => index === voloIndex ? true : Number(input.value) || 0 === 0);
    const isValid = othersAreZero && inputs[voloIndex].value === '-21';

    ADVANCE_TURN_BUTTON.textContent = 'Conferma mano (Volo: -21)';

    if (isValid) {
      ADVANCE_TURN_BUTTON.classList.remove('invalid');
      ADVANCE_TURN_BUTTON.classList.add('valid');
      ADVANCE_TURN_BUTTON.disabled = false;
    } else {
      ADVANCE_TURN_BUTTON.classList.remove('valid');
      ADVANCE_TURN_BUTTON.classList.add('invalid');
      ADVANCE_TURN_BUTTON.disabled = true;
    }
    return;
  }

  const scores = inputs.map((input) => Number(input.value) || 0);
  const total = scores.reduce((sum, score) => sum + score, 0);
  const isValid = total === 21;

  ADVANCE_TURN_BUTTON.textContent = `Conferma mano (${total}/21)`;

  if (isValid) {
    ADVANCE_TURN_BUTTON.classList.remove('invalid');
    ADVANCE_TURN_BUTTON.classList.add('valid');
    ADVANCE_TURN_BUTTON.disabled = false;
  } else {
    ADVANCE_TURN_BUTTON.classList.remove('valid');
    ADVANCE_TURN_BUTTON.classList.add('invalid');
    ADVANCE_TURN_BUTTON.disabled = true;
  }
}

function handleScoreButtonClick(event) {
  if (!HAND_FORM) return;

  const button = event.target;
  const isPlus = button.classList.contains('plus');
  const isMinus = button.classList.contains('minus');

  if (!isPlus && !isMinus) return;

  const playerIndex = Number(button.dataset.playerIndex);
  const input = HAND_FORM.querySelector(`input[data-player-index="${playerIndex}"]`);

  if (!input) return;

  if (input.dataset.volo === 'true') {
    input.dataset.volo = 'false';
    input.value = 0;
    updateHandTotal();
    return;
  }

  let currentValue = Number(input.value) || 0;

  if (isPlus) {
    currentValue += 1;
  } else if (isMinus && currentValue > 0) {
    currentValue -= 1;
  }

  input.value = currentValue;
  updateHandTotal();
}

function handleManualScoreInput(event) {
  const input = event.target;
  if (!input) return;

  const allInputs = Array.from(HAND_FORM.querySelectorAll('input[type="number"]'));
  const activeVolo = allInputs.findIndex((item) => item.dataset.volo === 'true');

  if (activeVolo !== -1) {
    allInputs.forEach((item) => {
      if (item !== input) {
        item.value = 0;
        item.dataset.volo = 'false';
      }
    });
    input.dataset.volo = 'true';
    input.value = -21;
    updateHandTotal();
    return;
  }

  const currentValue = Number(input.value) || 0;
  if (currentValue < 0) {
    input.value = 0;
  }

  updateHandTotal();
}

function handleVoloButtonClick(event) {
  event.preventDefault();
  if (!HAND_FORM) return;

  const button = event.target;
  const playerIndex = Number(button.dataset.playerIndex);
  const inputs = Array.from(HAND_FORM.querySelectorAll('input[type="number"]'));
  const input = inputs[playerIndex];

  if (!input) return;

  const activeVoloIndex = inputs.findIndex((item) => item.dataset.volo === 'true');

  if (activeVoloIndex === playerIndex) {
    inputs.forEach((item) => {
      item.dataset.volo = 'false';
      item.value = 0;
    });
    button.classList.remove('volo-triggered');
    updateHandTotal();
    return;
  }

  if (activeVoloIndex !== -1) {
    alert('❌ Nel turno corrente il volo può essere assegnato a un solo giocatore.');
    return;
  }

  inputs.forEach((item, index) => {
    item.dataset.volo = index === playerIndex ? 'true' : 'false';
    item.value = index === playerIndex ? -21 : 0;
  });
  updateHandTotal();

  button.classList.add('volo-triggered');
  setTimeout(() => button.classList.remove('volo-triggered'), 600);
}

function renderGlobalStats() {
  if (!GLOBAL_STATS_CONTENT) {
    return;
  }

  const stats = Object.values(state.globalStats || {}).sort((left, right) => right.wins - left.wins || right.matches - left.matches || left.name.localeCompare(right.name));

  if (!stats.length) {
    GLOBAL_STATS_CONTENT.innerHTML = '<div class="empty-state">Nessuna statistica salvata.</div>';
    return;
  }

  GLOBAL_STATS_CONTENT.innerHTML = `
    <div class="stats-summary">
      <div class="summary-pill live-pill">LIVE</div>
      <div class="summary-pill">${stats.length} giocatori</div>
      <div class="summary-pill">Top 3: ${stats.slice(0, 3).map((entry) => entry.name).join(', ') || '—'}</div>
    </div>
    <div class="stats-table-wrap">
      <table class="stats-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Giocatore</th>
            <th>Vittorie</th>
            <th>Partite</th>
            <th>Mani</th>
            <th>Volo</th>
          </tr>
        </thead>
        <tbody>
          ${stats
            .map((entry, index) => {
              const badge = index === 0 ? 'Campione' : index === 1 ? 'Vice' : index === 2 ? 'Podio' : 'Classifica';
              const rowClass = index === 0 ? 'is-leader' : index === 1 ? 'is-silver' : index === 2 ? 'is-bronze' : '';
              return `
                <tr class="${rowClass}">
                  <td class="rank-cell">
                    <span class="rank-badge">${index + 1}</span>
                  </td>
                  <td>
                    <div class="player-name-wrap">
                      <strong>${entry.name}</strong>
                      <span class="mini-tag">${badge}</span>
                    </div>
                  </td>
                  <td>${entry.wins}</td>
                  <td>${entry.matches}</td>
                  <td>${entry.handsPlayed}</td>
                  <td>${entry.voloCount}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function toggleStatsView() {
  state.statsViewVisible = !state.statsViewVisible;

  if (STATS_SCREEN) {
    STATS_SCREEN.hidden = !state.statsViewVisible;
  }

  if (state.currentGame) {
    if (GAME_SCREEN) {
      GAME_SCREEN.hidden = state.statsViewVisible;
    }
    if (SETUP_SCREEN) {
      SETUP_SCREEN.hidden = true;
    }
  } else if (SETUP_SCREEN) {
    SETUP_SCREEN.hidden = state.statsViewVisible;
  }

  if (STATS_TOGGLE_BUTTON) {
    STATS_TOGGLE_BUTTON.textContent = state.statsViewVisible ? 'Torna al gioco' : 'Statistiche';
  }
}

function resetToSetup() {
  state.currentGame = null;
  if (WINNER_BANNER) {
    WINNER_BANNER.hidden = true;
  }
  if (GAME_SCREEN) {
    GAME_SCREEN.hidden = true;
  }
  if (SETUP_SCREEN) {
    SETUP_SCREEN.hidden = false;
  }
  if (NEW_MATCH_BUTTON) {
    NEW_MATCH_BUTTON.hidden = true;
  }
  if (PLAYER_COUNT_INPUT) {
    PLAYER_COUNT_INPUT.value = '4';
  }
  if (TARGET_POINTS_SELECT) {
    TARGET_POINTS_SELECT.value = '151';
  }
  renderPlayerInputs();
}

if (PLAYER_COUNT_INPUT) {
  PLAYER_COUNT_INPUT.addEventListener('input', renderPlayerInputs);
}
if (SETUP_FORM) {
  SETUP_FORM.addEventListener('submit', (event) => {
    event.preventDefault();
    openGame();
  });
}
if (ADVANCE_TURN_BUTTON) {
  ADVANCE_TURN_BUTTON.addEventListener('click', completeHand);
}
if (NEW_MATCH_BUTTON) {
  NEW_MATCH_BUTTON.addEventListener('click', resetToSetup);
}
if (STATS_TOGGLE_BUTTON) {
  STATS_TOGGLE_BUTTON.addEventListener('click', toggleStatsView);
}
if (RESET_STATS_BUTTON) {
  RESET_STATS_BUTTON.addEventListener('click', () => {
    resetGlobalStats();
    renderGlobalStats();
  });
}
if (STATS_BACK_BUTTON) {
  STATS_BACK_BUTTON.addEventListener('click', () => {
    if (state.statsViewVisible) {
      state.statsViewVisible = false;
      if (STATS_SCREEN) {
        STATS_SCREEN.hidden = true;
      }
      if (state.currentGame && GAME_SCREEN) {
        GAME_SCREEN.hidden = false;
      } else if (SETUP_SCREEN) {
        SETUP_SCREEN.hidden = false;
      }
      if (STATS_TOGGLE_BUTTON) {
        STATS_TOGGLE_BUTTON.textContent = 'Statistiche';
      }
    }
  });
}

if (typeof document !== 'undefined') {
  renderPlayerInputs();
  renderGlobalStats();
}
