// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO to handle CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Adjust this if your client runs on a different origin
    methods: ["GET", "POST"],
    credentials: true
  }
});

const games = {}; // Store game states by room ID

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a game room
  socket.on('joinGame', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;

    // Initialize game state if not existing
    if (!games[roomId]) {
      games[roomId] = {
        game: new Chess(),
        players: [],
        gameOver: false
      };
    }

    const gameData = games[roomId];

    // Assign player color
    if (gameData.players.length < 2) {
      const color = gameData.players.length === 0 ? 'w' : 'b';
      gameData.players.push({ socketId: socket.id, color });
      console.log(`Player ${socket.id} assigned color ${color}`);
      socket.emit('playerColor', color);
    } else {
      console.log(`Spectator ${socket.id} joined room ${roomId}`);
      socket.emit('spectator');
    }

    // Send current game state
    socket.emit('gameState', gameData.game.fen());
  });

  // Handle moves
  socket.on('move', (move) => {
    const roomId = socket.roomId;
    const gameData = games[roomId];

    if (gameData && !gameData.gameOver) {
      // Get the player who made the move
      const player = gameData.players.find(p => p.socketId === socket.id);

      // Validate that it's the player's turn
      if (player && gameData.game.turn() === player.color) {
        // Make the move
        const result = gameData.game.move(move);

        if (result) {
          // Emit the updated game state and the move made
          io.to(roomId).emit('gameState', gameData.game.fen());
          io.to(roomId).emit('moveMade', move);

          // Check for game over conditions
          if (gameData.game.isGameOver()) {
            let message;
            if (gameData.game.isCheckmate()) {
              const winner = gameData.game.turn() === 'w' ? 'Black' : 'White';
              message = `${winner} wins by checkmate`;
            } else if (gameData.game.isDraw()) {
              message = 'Game is a draw';
            } else if (gameData.game.isStalemate()) {
              message = 'Game is a draw by stalemate';
            } else if (gameData.game.isThreefoldRepetition()) {
              message = 'Game is a draw by threefold repetition';
            } else if (gameData.game.isInsufficientMaterial()) {
              message = 'Game is a draw by insufficient material';
            } else {
              message = 'Game over';
            }

            io.to(roomId).emit('gameOver', message);
            gameData.gameOver = true;
          }
        }
      }
    }
  });

  // Handle Resignation
  socket.on('resign', () => {
    const roomId = socket.roomId;
    const gameData = games[roomId];

    if (gameData && !gameData.gameOver) {
      const resigningPlayer = gameData.players.find(
        (p) => p.socketId === socket.id
      );
      const resigningColor = resigningPlayer ? resigningPlayer.color : null;
      const winningColor = resigningColor === 'w' ? 'Black' : 'White';

      const message = `${winningColor} wins by resignation`;
      io.to(roomId).emit('gameOver', message);
      gameData.gameOver = true;

      console.log(`Player ${socket.id} resigned. ${message}`);
    }
  });

  // Handle Timeouts
  socket.on('timeout', () => {
    const roomId = socket.roomId;
    const gameData = games[roomId];

    if (gameData && !gameData.gameOver) {
      const timingOutPlayer = gameData.players.find(
        (p) => p.socketId === socket.id
      );
      const timingOutColor = timingOutPlayer ? timingOutPlayer.color : null;
      const winningColor = timingOutColor === 'w' ? 'Black' : 'White';

      const message = `${winningColor} wins by timeout`;
      io.to(roomId).emit('gameOver', message);
      gameData.gameOver = true;

      console.log(`Player ${socket.id} timed out. ${message}`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.roomId;
    const gameData = games[roomId];

    if (gameData) {
      const disconnectedPlayer = gameData.players.find(
        (p) => p.socketId === socket.id
      );

      if (disconnectedPlayer && !gameData.gameOver) {
        // Declare the other player as the winner
        const remainingPlayer = gameData.players.find(
          (p) => p.socketId !== socket.id
        );

        if (remainingPlayer) {
          const winningColor = disconnectedPlayer.color === 'w' ? 'Black' : 'White';
          const message = `${winningColor} wins by opponent disconnect`;
          io.to(roomId).emit('gameOver', message);
        }

        gameData.gameOver = true;
      }

      // Remove the player from the room
      gameData.players = gameData.players.filter(
        (player) => player.socketId !== socket.id
      );

      // Clean up the game if no players are left
      if (gameData.players.length === 0) {
        delete games[roomId];
        console.log(`Game in room ${roomId} has been deleted due to no players.`);
      }
    }
  });
});

server.listen(4000, () => {
  console.log('Server is listening on port 4000');
});
