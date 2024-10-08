const express = require("express");
const socketIO = require("socket.io");
const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
const {join} = require("path");
const io = socketIO(server);
app.use(express.static(join(__dirname, "public")));
const PriorityQueue = require("./priorityQueue.js");

class User {
    constructor(socket, data) {
        this.socket = socket;
        this.data = data;
        this.isConnected = false;
        this.matchId = null;
        this.tags = data.tags;
    }
}

// Variables
let users = {}; //Key: Socket_ID  Value: User
let invertedIndex = {}; //Key: Tag  Value: User List
let tagDictionary = {}; //Key: Tag  Value: Frequency
let pqUser = {}; //Key: User_ID   Value: Priority_queue( user with weights ) for matching
let commonTagsFrequency = {}; //Count of number of tags that are common between two users
io.on("connection", (socket) => {
    console.log("New User Connected");

    socket.on("register", (data) => {
        console.log("User Registered:" + data + " with socketid " + socket.id);
        generateII(data);
        generateDictionary(data);
        socket.emit("waiting");
        searchUser(data);
    });

    function generateII(data) {
        commonTagsFrequency[socket.id] = commonTagsFrequency[socket.id] || {};
        pqUser[socket.id] = new PriorityQueue();
        users[socket.id] = new User(socket, data);

        data.tags.forEach(tag => {
            invertedIndex[tag] = invertedIndex[tag] || [];
            invertedIndex[tag].push(socket.id);
            invertedIndex[tag].forEach(u => {
                if (u !== socket.id) {
                    commonTagsFrequency[socket.id][u] = (commonTagsFrequency[socket.id][u] || 0) + 1;
                    commonTagsFrequency[u][socket.id] = (commonTagsFrequency[u][socket.id] || 0) + 1;
                }
            });
        });
        Object.entries(commonTagsFrequency[socket.id]).forEach(([key, val]) => {
            pqUser[socket.id].enqueue(key, val);
            pqUser[key].enqueue(socket.id, val);
        });
    }

    function generateDictionary(Data) {
        for (let tag of Data.tags) {
            if (!tagDictionary[tag]) tagDictionary[tag] = 0;
            tagDictionary[tag]++;
        }
    }


    function searchUser() {
        console.log("SEARCHING");
        let currentUserSocket = socket;
        let bestMatch = {matchingTags: [], user: null};
        let unavailable_user = [];
        let bestUser;

        function dequeueBestUser() {
            if (!pqUser[socket.id].isEmpty()) return pqUser[socket.id].dequeue();
            return null;
        }

        bestUser = dequeueBestUser();
        // while bestUser is not null and user is connected
        while (bestUser && users[bestUser.element].isConnected === true) {
            unavailable_user.push(bestUser);
            bestUser = dequeueBestUser();
        }

        while (unavailable_user.length !== 0) {
            let usr = unavailable_user.pop();
            pqUser[socket.id].enqueue(usr.element, usr.priority);
        }

        if (bestUser && bestUser.element) {
            let matchingTags;
            bestMatch.matchingTags = matchingTags;
            bestMatch.user = bestUser;
            emitMatch(currentUserSocket, bestMatch);
        } else {
            console.log("no match found");
            currentUserSocket.emit("waiting");
        }
    }

    function emitMatch(currentUserSocket, bestMatch) {
        let matchedTags = bestMatch.matchingTags;
        console.log(
            `matched with ${bestMatch.user.element} and user ${currentUserSocket.id}`
        );
        currentUserSocket.emit("match", matchedTags);
        users[bestMatch.user.element].socket.emit("match", matchedTags);
        users[currentUserSocket.id].isConnected = true;
        users[bestMatch.user.element].isConnected = true;
        let cuser = currentUserSocket.id;
        users[cuser].matchId = bestMatch.user.element;
        let muser = bestMatch.user.element;
        users[muser].matchId = currentUserSocket.id;
    }

    socket.on("message", (message) => {
        let user = users[socket.id];
        console.log(user);
        if (user.matchId) console.log(socket.id + " sent: " + message + " to " + user.matchId);
        if (user && user.isConnected) {
            let match = users[user.matchId];
            if (match) {
                match.socket.emit("message", message);
            }
        }
    });
    socket.on("typing", () => {
        let user = users[socket.id];
        if (user && user.isConnected) {
            let match = users[user.matchId];
            if (match) {
                match.socket.emit("typing");
            }
        }
    });
    socket.on("stop_typing", () => {
        let user = users[socket.id];
        if (user && user.isConnected) {
            let match = users[user.matchId];
            if (match) {
                match.socket.emit("stop_typing");
            }
        }
    });
    socket.on("skip", async () => {
        console.log("Skipping.....");
        console.log(pqUser[socket.id]);
        let user = users[socket.id];
        if (user && user.isConnected) {
            let otherUser = users[user.matchId];
            if (otherUser) {
                otherUser.isConnected = false;
                otherUser.matchId = null;
                console.log(commonTagsFrequency[user.socket.id][otherUser.socket.id]);
                commonTagsFrequency[user.socket.id][otherUser.socket.id] /= 10;
                pqUser[user.socket.id].enqueue(otherUser.socket.id, commonTagsFrequency[user.socket.id][otherUser.socket.id]);
                commonTagsFrequency[otherUser.socket.id][user.socket.id] /= 10;
                pqUser[otherUser.socket.id].enqueue(user.socket.id, commonTagsFrequency[otherUser.socket.id][user.socket.id]);
                // handleMatchQueue();
            }
            socket.emit("waiting");
            searchUser(user.data);
        }
    });
    socket.on("disconnect", () => {
        let user = users[socket.id];
        if (user) {
            user.isConnected = false;
            delete users[socket.id];
            delete commonTagsFrequency[socket.id];
            delete pqUser[socket.id];
        }
    });
    socket.on("leave_chat", () => {
        let user = users[socket.id];
        if (user && user.isConnected) {
            let match = users[user.matchId];
            if (match) {
                match.socket.emit("partner_left");
                match.isConnected = false;
            }
            user.isConnected = false;
        }
    });
});
