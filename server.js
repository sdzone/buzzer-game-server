const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// --- This is the critical part ---
// We must allow connections from your 'register.lk' website
const io = socketIo(server, {
  cors: {
    origin: "*", // You can replace "*" with your http://your-domain.lk
    methods: ["GET", "POST"]
  }
});
// ---------------------------------

// Serve a simple page just to check if the server is working
app.get('/', (req, res) => {
  res.send('Your Buzzer Game Server is running!');
});

// --- Game Logic ---
let buzzerLocked = false;
let scores = {
  "Team A": 0,
  "Team B": 0,
  "Team C": 0
};
let lastBuzzerWinner = null; // To keep track of who to give points to

// --- Real-time Magic ---
io.on('connection', (socket) => {
  console.log('A user connected: ', socket.id);

  // Send the current scores to the user who just connected
  socket.emit('score-update', scores);

  // Listen for a student pressing the buzzer
  socket.on('buzz', (student) => {
    // Check if the buzzer is already locked
    if (!buzzerLocked) {
      // 1. Lock the buzzer immediately
      buzzerLocked = true;
      lastBuzzerWinner = student; // Save who buzzed
      
      // 2. Announce the winner to the ADMIN panel
      console.log(`Buzzer pressed by: ${student.name}`);
      io.emit('buzz-winner', student); // Sends to ALL clients (admin will pick it up)
    }
  });

  // Listen for the admin resetting the buzzer
  socket.on('reset-buzzer', () => {
    buzzerLocked = false; // Unlock the buzzer
    lastBuzzerWinner = null; // Clear the last winner
    io.emit('reset'); // Tell all students to re-enable their buttons
    console.log('Buzzer has been reset');
  });

  // Listen for admin score commands
  socket.on('update-score', (command) => {
    if (lastBuzzerWinner) {
      const team = lastBuzzerWinner.team;
      if (team && scores.hasOwnProperty(team)) {
        if (command === 'correct') {
          scores[team] += 10;
        } else if (command === 'wrong') {
          scores[team] -= 10;
        }
      }
    }
    // Send the updated scores to everyone (admin and all students)
    io.emit('score-update', scores);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected: ', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});