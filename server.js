const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", // Allows all origins
    methods: ["GET", "POST"]
  }
});

app.get('/', (req, res) => {
  res.send('Buzzer Game Server is live! (v2 with Dynamic Teams)');
});

// --- New Dynamic Game Logic ---
let buzzerLocked = false;
let lastBuzzerWinner = null;
let currentScores = {}; // Scores are now a dynamic object
let currentTeams = []; // The list of team names

// --- Real-time Communication ---
io.on('connection', (socket) => {
  console.log('A user connected: ', socket.id);

  // Send the current game state to the person who just connected
  socket.emit('game-updated', {
    teams: currentTeams,
    scores: currentScores
  });

  // NEW: Listen for the admin creating a new game
  socket.on('start-game', (newTeams) => {
    console.log('Starting new game with teams:', newTeams);
    currentTeams = newTeams; // e.g., ['Red', 'Blue']
    currentScores = {}; // Reset scores
    
    // Create the new score object
    currentTeams.forEach(team => {
      currentScores[team] = 0;
    });

    buzzerLocked = false;
    lastBuzzerWinner = null;

    // Send the new game state to EVERYONE
    io.emit('game-updated', {
      teams: currentTeams,
      scores: currentScores
    });
    
    // Also reset the buzzers
    io.emit('reset');
  });

  // Listen for a student pressing the buzzer
  socket.on('buzz', (student) => {
    if (!buzzerLocked) {
      buzzerLocked = true;
      lastBuzzerWinner = student;
      io.emit('buzz-winner', student);
    }
  });

  // Listen for the admin resetting the buzzer
  socket.on('reset-buzzer', () => {
    buzzerLocked = false;
    lastBuzzerWinner = null;
    io.emit('reset');
    console.log('Buzzer has been reset');
  });

  // Listen for admin scoring
  socket.on('update-score', (command) => {
    if (lastBuzzerWinner) {
      const team = lastBuzzerWinner.team;
      // Check if the team exists in our dynamic object
      if (team && currentScores.hasOwnProperty(team)) {
        if (command === 'correct') {
          currentScores[team] += 10;
        } else if (command === 'wrong') {
          currentScores[team] -= 10;
        }
      }
    }
    // Send the updated scores to everyone
    io.emit('game-updated', {
      teams: currentTeams,
      scores: currentScores
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected: ', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
