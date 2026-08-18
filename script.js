const MAX_HISTORY = 5;
const state = {
  matchHistory: [],
  currentGame: null,
};

const PLAYER_COUNT_INPUT = typeof document !== 'undefined' ? document.getElementById('player-count') : null;
const PLAYER_INPUTS_CONTAINER = typeof document !== 'undefined' ? document.getElementById('player-inputs') : null;
const FIRST_DEALER_SELECT = typeof document !== 'undefined' ? document.getElementById('first-dealer') : null;
const TARGET_POINTS_SELECT = typeof document !== 'undefined' ? document.getElementById('target-points') : null;
const SETUP_FORM = typeof document !== 'undefined' ? document.getElementById('setup-form') : null;
const GAME_SCREEN = typeof document !== 'undefined' ? document.getElementById('game-screen') : null;
const SETUP_SCREEN = typeof document !== 'undefined' ? document.getElementById('setup-screen') : null;
const HAND_FORM = typeof document !== 'undefined' ? document.getElementById('hand-form') : null;
const CLASSIFICATION_CONTAINER = typeof document !== 'undefined' ? document.getElementById('classification') : null;
const DEALER_DISPLAY = typeof document !== 'undefined' ? document.getElementById('dealer-display') : null;
const ROUND_DISPLAY = typeof document !== 'undefined' ? document.getElementById('round-display') : null;
const TARGET_DISPLAY = typeof document !== 'undefined' ? document.getElementById('target-display') : null;
const WINNER_BANNER = typeof document !== 'undefined' ? document.getElementById('winner-banner') : null;
const NEW_MATCH_BUTTON = typeof document !== 'undefined' ? document.getElementById('new-match-button') : null;
const ADVANCE_TURN_BUTTON = typeof document !== 'undefined' ? document.getElementById('advance-turn') : null;

export function buildPlayers(names) {
  return names.map((name, index) => ({
    id: index,
    name: name.trim(),
    total: 0,
    handScores: [],
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
  };
}

export function calculateWinner(players) {
  const lowestTotal = Math.min(...players.map((player) => player.total));
  const winners = players.filter((player) => player.total === lowestTotal);
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
    }))
    .sort((left, right) => {
      if (left.total !== right.total) {
        return left.total - right.total;
      }
      return left.name.localeCompare(right.name);
    });
}

export function applyHandToGame(game, handScores) {
  const normalizedScores = handScores.map((score) => Number(score) || 0);

  if (normalizedScores.length !== game.players.length) {
    throw new Error('Il numero di punteggi deve corrispondere al numero di giocatori.');
  }

  game.players.forEach((player, index) => {
    const score = Math.max(0, normalizedScores[index]);
    player.total += score;
    player.handScores.push(score);
  });

  if (game.players.some((player) => player.total >= game.targetPoints)) {
    const winner = calculateWinner(game.players);
    game.isFinished = true;
    game.winner = winner ? winner.name : null;
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

  const targetPoints = Number(TARGET_POINTS_SELECT.value) || 151;
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

  if (!TARGET_DISPLAY || !DEALER_DISPLAY || !ROUND_DISPLAY || !HAND_FORM || !CLASSIFICATION_CONTAINER || !WINNER_BANNER) {
    return;
  }

  TARGET_DISPLAY.textContent = String(game.targetPoints);
  DEALER_DISPLAY.textContent = game.players[game.dealerIndex]?.name ?? '-';
  ROUND_DISPLAY.textContent = String(game.roundNumber);

  if (game.isFinished && game.winner) {
    const sortedPlayers = computeLeaderboard(game.players, state.matchHistory);
    const winner = sortedPlayers[0];
    WINNER_BANNER.hidden = false;
    WINNER_BANNER.textContent = `Partita terminata: ${winner.name} vince con ${winner.total} punti.`;
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
              <input type="number" min="0" step="1" value="0" data-player-index="${index}" />
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

  // Add event listeners for score buttons
  if (HAND_FORM) {
    HAND_FORM.querySelectorAll('.score-btn').forEach(button => {
      button.addEventListener('click', handleScoreButtonClick);
    });
    HAND_FORM.querySelectorAll('.volo-btn').forEach(button => {
      button.addEventListener('click', handleVoloButtonClick);
    });
    HAND_FORM.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('input', updateHandTotal);
    });
  }
  
  updateHandTotal();
}

function completeHand() {
  if (!state.currentGame || state.currentGame.isFinished || !HAND_FORM) {
    return;
  }

  const scores = Array.from(HAND_FORM.querySelectorAll('input[type="number"]')).map((input) => input.value);
  const total = scores.reduce((sum, score) => sum + Number(score), 0);

  // Validazione: il totale deve essere esattamente 21
  if (total !== 21) {
    alert(`❌ Errore! Il totale deve essere esattamente 21 punti.\nAttualmente: ${total} punti`);
    return;
  }

  const nextGame = applyHandToGame(state.currentGame, scores);
  state.currentGame = nextGame;

  if (nextGame.isFinished && nextGame.winner) {
    state.matchHistory.push(nextGame.winner);
    if (state.matchHistory.length > MAX_HISTORY) {
      state.matchHistory = state.matchHistory.slice(-MAX_HISTORY);
    }
  }

  renderGameBoard();
}

function updateHandTotal() {
  if (!HAND_FORM || !ADVANCE_TURN_BUTTON) return;

  const scores = Array.from(HAND_FORM.querySelectorAll('input[type="number"]')).map((input) => Number(input.value) || 0);
  const total = scores.reduce((sum, score) => sum + score, 0);
  const isValid = total === 21;

  // Aggiorna il testo del bottone con il totale
  ADVANCE_TURN_BUTTON.textContent = `Conferma mano (${total}/21)`;

  // Abilita/disabilita il bottone in base alla validazione
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
  
  let currentValue = Number(input.value) || 0;
  
  if (isPlus) {
    currentValue += 1;
  } else if (isMinus && currentValue > 0) {
    currentValue -= 1;
  }
  
  input.value = currentValue;
}

function handleVoloButtonClick(event) {
  event.preventDefault();
  if (!HAND_FORM) return;
  
  const button = event.target;
  const playerIndex = Number(button.dataset.playerIndex);
  const input = HAND_FORM.querySelector(`input[data-player-index="${playerIndex}"]`);
  
  if (!input) return;
  
  // Sottrai 21 punti (aggiungi 21 al punteggio della mano, che viene sottratto dal totale)
  const currentValue = Number(input.value) || 0;
  input.value = currentValue + 21;
  
  // Aggiungi effetto visivo al bottone
  button.classList.add('volo-triggered');
  setTimeout(() => button.classList.remove('volo-triggered'), 600);
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

if (typeof document !== 'undefined') {
  renderPlayerInputs();
}
