const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Przechowywanie pokojów oraz graczy
let rooms = {};

// Endpoint do stworzenia pokoju
app.get('/create-room', (req, res) => {
  const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
  rooms[roomCode] = { players: [], host: null, gameStarted: false };
  res.json({ roomCode });
});

// Dołączenie do pokoju
io.on('connection', (socket) => {
  socket.on('join-room', ({ playerName, roomCode }) => {
    const room = rooms[roomCode];
    if (room && room.players.length < 5) {
      socket.join(roomCode);
      room.players.push({ id: socket.id, name: playerName });
      if (!room.host) room.host = socket.id; // Ustawienie hosta, jeśli nie istnieje

      io.to(roomCode).emit('update-players', room.players);
      socket.emit('joined-room', { roomCode, isHost: room.host === socket.id });
    } else {
      socket.emit('error', 'Nieprawidłowy kod pokoju lub pokój pełny');
    }
  });

  // Rozpoczęcie gry
  socket.on('start-game', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.host === socket.id && room.players.length > 1) {
      room.gameStarted = true;
      const order = room.players.map(player => player.name).sort(() => Math.random() - 0.5);
      io.to(roomCode).emit('game-started', { order });
    }
  });

  // Wybór akcji przez gracza
  socket.on('choose-action', ({ roomCode, action }) => {
    const question = ["Podaj symbol tlenu", "Wymień kwas chlorowodorowy"][Math.floor(Math.random() * 2)]; // Przykładowe pytanie
    io.to(roomCode).emit('action-chosen', { playerId: socket.id, action, question });
  });

  // Rozłączenie
  socket.on('disconnect', () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      room.players = room.players.filter(player => player.id !== socket.id);
      if (room.players.length === 0) delete rooms[roomCode]; // Usunięcie pustego pokoju
      else io.to(roomCode).emit('update-players', room.players);
    }
  });
});

server.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
