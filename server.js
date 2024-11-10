// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
// const io = new Server(server);
// Configure Socket.IO to handle CORS
const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

const games = {}; // Store game states by room ID

io.on('connection', (socket) => {
  console.log('a user connected');

  // Join a game room
  socket.on('joinGame', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;

    // Initialize game state if not existing
    if (!games[roomId]) {
      games[roomId] = {
        game: new Chess(),
        players: [],
      };
    }

    // Assign player color
    if (games[roomId].players.length < 2) {
      const color = games[roomId].players.length === 0 ? 'w' : 'b';
      games[roomId].players.push({ socketId: socket.id, color });
      console.log('playercolor',color)
      socket.emit('playerColor', color);
    } else {
      console.log('spectator')
      socket.emit('spectator');
    }

    // Send current game state
    console.log('gamestate',games[roomId].game.fen())
    socket.emit('gameState', games[roomId].game.fen());
  });

  // Handle moves
  socket.on('move', (move) => {
    const roomId = socket.roomId;
    const gameData = games[roomId];

    if (gameData && gameData.game.move(move)) {
      io.to(roomId).emit('gameState', gameData.game.fen());
      io.to(roomId).emit('moveMade', move);

      // Check for game over
    //   if (gameData.game.game_over()) {
    //     io.to(roomId).emit('gameOver', gameData.game.fen());
    //     delete games[roomId];
    //   }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('user disconnected');
    const roomId = socket.roomId;
    if (games[roomId]) {
      games[roomId].players = games[roomId].players.filter(
        (player) => player.socketId !== socket.id
      );
      if (games[roomId].players.length === 0) {
        delete games[roomId];
      }
    }
  });
});

server.listen(4000, () => {
  console.log('listening on *:4000');
});
