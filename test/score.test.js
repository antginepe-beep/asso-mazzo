import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyHandToGame,
  calculateWinner,
  computeLeaderboard,
  createGame,
  getWinProbability,
  rotateDealer,
} from '../script.js';

test('rotateDealer cycles among players', () => {
  assert.equal(rotateDealer(0, 4), 1);
  assert.equal(rotateDealer(3, 4), 0);
});

test('createGame initializes players and dealer', () => {
  const game = createGame({
    playerNames: ['Alice', 'Bob', 'Charlie'],
    targetPoints: 151,
    firstDealerIndex: 2,
  });

  assert.equal(game.players.length, 3);
  assert.equal(game.players[0].name, 'Alice');
  assert.equal(game.dealerIndex, 2);
  assert.equal(game.targetPoints, 151);
});

test('applyHandToGame adds scores and rotates dealer', () => {
  const game = createGame({
    playerNames: ['Alice', 'Bob', 'Charlie'],
    targetPoints: 151,
    firstDealerIndex: 1,
  });

  applyHandToGame(game, [12, 18, 20]);

  assert.deepEqual(game.players.map((player) => player.total), [12, 18, 20]);
  assert.equal(game.dealerIndex, 2);
  assert.equal(game.roundNumber, 2);
});

test('calculateWinner picks the player with the lowest total', () => {
  const game = createGame({
    playerNames: ['Alice', 'Bob', 'Charlie'],
    targetPoints: 151,
    firstDealerIndex: 0,
  });

  game.players[0].total = 90;
  game.players[1].total = 110;
  game.players[2].total = 120;

  const winner = calculateWinner(game.players);
  assert.equal(winner.name, 'Alice');
});

test('computeLeaderboard sorts by total and includes averages and win probability', () => {
  const players = [
    { name: 'Alice', total: 70, handScores: [20, 25, 25] },
    { name: 'Bob', total: 90, handScores: [30, 30, 30] },
  ];

  const leaderboard = computeLeaderboard(players, ['Alice', 'Alice', 'Bob', 'Alice']);

  assert.equal(leaderboard[0].name, 'Alice');
  assert.equal(leaderboard[0].averagePoints, 23.333333333333332);
  assert.equal(leaderboard[0].winProbability, 75);
  assert.equal(leaderboard[1].name, 'Bob');
  assert.equal(leaderboard[1].winProbability, 25);
});

test('getWinProbability uses the last five matches', () => {
  assert.equal(getWinProbability('Alice', ['Alice', 'Bob', 'Alice', 'Bob', 'Alice']), 60);
  assert.equal(getWinProbability('Charlie', ['Alice', 'Bob', 'Alice']), 0);
});

test('applyHandToGame ends the match when any player reaches the target threshold', () => {
  const game = createGame({
    playerNames: ['Alice', 'Bob', 'Charlie'],
    targetPoints: 150,
    firstDealerIndex: 0,
  });

  game.players[0].total = 140;
  game.players[1].total = 130;
  game.players[2].total = 120;

  applyHandToGame(game, [10, 30, 0]);

  assert.equal(game.isFinished, true);
  assert.equal(game.winner, 'Bob');
});
