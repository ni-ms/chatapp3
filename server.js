const express = require('express');
const socketIO = require('socket.io');
const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
const {join} = require("path");
const io = socketIO(server);
app.use(express.static(join(__dirname, 'public')));
const uniqid = require('uniqid');
let users = {};
const matchQueue = [];
io.on('connection', socket => {
    console.log('New User Connected');

    function searchUser(data) {
        let currentUserSocket = socket;
        let potentialMatches = Object.values(users).filter(user => !user.isConnected && user.socket.id !== currentUserSocket.id);
        let skippedUser = users[currentUserSocket.id];
        if (skippedUser) {
            potentialMatches = potentialMatches.filter(user => user.socket.id !== skippedUser.matchId);
        }
        potentialMatches = potentialMatches.sort(() => Math.random() - 0.5);
        let bestMatch = {matchingTags: [], user: null};
        for (let user of potentialMatches) {
            let matchingTags = user.data.tags.filter(tag => data.tags.includes(tag));
            if (matchingTags.length > bestMatch.matchingTags.length) {
                bestMatch = {matchingTags, user};
            }
        }
        if (bestMatch.user) {
            let matchedTags = bestMatch.matchingTags;
            console.log('matched with ' + bestMatch.user.socket.id + ' and user ' + currentUserSocket.id);
            currentUserSocket.emit('match', matchedTags);
            bestMatch.user.socket.emit('match', matchedTags);
            bestMatch.user.isConnected = true;
            users[currentUserSocket.id].isConnected = true;
            let cuser = users[currentUserSocket.id];
            cuser.matchId = bestMatch.user.socket.id;
            let muser = users[bestMatch.user.socket.id];
            muser.matchId = currentUserSocket.id;
        } else {
            console.log('no match found');
            currentUserSocket.emit('no_match');
        }
        handleMatchQueue();
    }

    function handleMatchQueue() {
        if (matchQueue.length >= 2) {
            const user1 = matchQueue.shift();
            const user2 = matchQueue.shift();
            searchUser(user1.data);
          // searchUser(user2.data);
        }
    }

    socket.on('register', data => {
        console.log('REGISTER WITH');
        console.log(data);
        console.log(' and socketid ' + socket.id);
        users[socket.id] = {socket, data, isConnected: false, matchId: null};
        // console.log(users[socket.id]);
        //emit waiting event
        socket.emit('waiting');
        searchUser(data);
    });
    socket.on('message', message => {
        let user = users[socket.id];
        console.log(socket.id + " sent: " + message + " to " + user.matchId);
        if (user && user.isConnected) {
            let match = users[user.matchId];
            if (match) {
                match.socket.emit('message', message);
            }
        }
    });
    socket.on('typing', () => {
        let user = users[socket.id];
        if (user && user.isConnected) {
            let match = users[user.matchId];
            if (match) {
                match.socket.emit('typing');
            }
        }
    });
    socket.on('stop_typing', () => {
        let user = users[socket.id];
        if (user && user.isConnected) {
            let match = users[user.matchId];
            if (match) {
                match.socket.emit('stop_typing');
            }
        }
    });
    socket.on('skip', async () => {
        let user = users[socket.id];
        if (user && user.isConnected) {
            let otherUser = users[user.matchId];
            if (otherUser) {
                otherUser.isConnected = false;
                otherUser.matchId = null;
                otherUser.socket.emit('waiting');
                console.log('user ' + otherUser.socket.id + ' was skipped by ' + user.socket.id);
                user.isConnected = false;
                user.matchId = null;
                matchQueue.push(user, otherUser);
                handleMatchQueue();
            }
        }
    });
    socket.on('disconnect', () => {
        let user = users[socket.id];
        if (user) {
            user.isConnected = false;
            delete users[socket.id];
        }
    });
    socket.on('leave_chat', () => {
        let user = users[socket.id];
        if (user && user.isConnected) {
            let match = users[user.matchId];
            if (match) {
                match.socket.emit('partner_left');
                match.isConnected = false;
            }
            user.isConnected = false;
        }
    });
});
