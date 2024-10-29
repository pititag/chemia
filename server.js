const https = require('https');
const fs = require('fs');
const express = require('express');
const { Server } = require('socket.io');

const app = express();

const httpsOptions = {
  key: fs.readFileSync('/home/ec2-user/certs/privkey.pem'),
  cert: fs.readFileSync('/home/ec2-user/certs/cert.pem') 
};

const server = https.createServer(httpsOptions, app);
const io = new Server(server);

const PORT = 3000;

app.get('/', (req, res) => {
    res.send('Serwer HTTPS działa poprawnie');
});

io.on('connection', (socket) => {
    // Logika dla `socket.io`
});

server.listen(PORT, () => {
    console.log(`Serwer działa na HTTPS na porcie ${PORT}`);
});

// Endpoint do sprawdzenia działania serwera
app.get('/', (req, res) => {
    res.send('Serwer działa poprawnie');
});

// Przechowywanie pokojów oraz graczy
let rooms = {};

// Dołączenie do pokoju
io.on('connection', (socket) => {
    socket.on('create-room', ({ playerName }) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = { players: [{ id: socket.id, name: playerName, isHost: true }], host: socket.id, gameStarted: false };
        
        socket.join(roomCode);
        socket.emit('room-created', { roomCode, playerName });
        io.to(roomCode).emit('update-players', rooms[roomCode].players);
    });

    socket.on('join-room', ({ playerName, roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.players.length < 5) {
            socket.join(roomCode);
            room.players.push({ id: socket.id, name: playerName, isHost: false });
            io.to(roomCode).emit('update-players', room.players);
            socket.emit('joined-room', { roomCode, players: room.players });
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
        const question = ["Podaj symbol tlenu", "Wymień kwas chlorowodorowy"][Math.floor(Math.random() * 2)];
        io.to(roomCode).emit('action-chosen', { playerId: socket.id, action, question });
    });

    // Rozłączenie gracza
    socket.on('disconnect', () => {
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            room.players = room.players.filter(player => player.id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[roomCode];
            } else {
                io.to(roomCode).emit('update-players', room.players);
            }
        }
    });
});

// Uruchomienie serwera
server.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});

