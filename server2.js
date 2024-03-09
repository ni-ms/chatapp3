const express = require("express");
const socketIO = require("socket.io");
const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
const { join } = require("path");
const io = socketIO(server);
app.use(express.static(join(__dirname, "public")));
const uniqid = require("uniqid");

const PriorityQueue = require("./priorityQueue.js");

let users = {};
let tag_map = {}; //Key: Tag  Value: User List
let user_freq_map = {}; //Key: User_ID   Value: Priority_queue( user with weights ) for matching
let user_freq = {}; //key:user Value:It's Frequency
const matchQueue = [];
io.on("connection", (socket) => {
  console.log("New User Connected");

  function searchUser(data) {
    console.log("SEARCHING");
    let currentUserSocket = socket;

    let bestMatch = { matchingTags: [], user: null };
    let unavailable_user = [];
    let bestUser = null;
    console.log(user_freq_map[socket.id]);
    if(!user_freq_map[socket.id].isEmpty())bestUser = user_freq_map[socket.id].dequeue();
    if(bestUser)console.log(`Best User: ${bestUser.element}`);
    if(bestUser)console.log(`Best User Connected: ${users[bestUser.element].isConnected}`);
    while(bestUser && users[bestUser.element].isConnected === true)
    {
        unavailable_user.push(bestUser);
        if(!user_freq_map[socket.id].isEmpty())bestUser = user_freq_map[socket.id].dequeue();
        else bestUser = null;
    }
    while(unavailable_user.length != 0)
    {
      let usr = unavailable_user.pop();
      user_freq_map[socket.id].enqueue(usr.element,usr.priority);
    }
    console.log(user_freq_map[socket.id]);
    if(bestUser)console.log(`BestUser:${bestUser.element}:${bestUser.priority}`);

    if (bestUser && bestUser.element) {
      let matchingTags = users[bestUser.element].data.tags.filter((tag) =>
        data.tags.includes(tag)
      );
      bestMatch.matchingTags = matchingTags;
      bestMatch.user = bestUser;
      console.log(
        `BestMatch:${bestMatch.matchingTags}:${bestMatch.user.element}`
      );
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
      // console.log(cuser,muser);
    } else {
      console.log("no match found");
      currentUserSocket.emit("waiting");
    }
    // handleMatchQueue();
  }

  // function handleMatchQueue() {
  //     if (matchQueue.length >= 2) {
  //         const user1 = matchQueue.shift();
  //         const user2 = matchQueue.shift();
  //         searchUser(user1.data);
  //       // searchUser(user2.data);
  //     }
  // }

  socket.on("register", (data) => {
    console.log("REGISTER WITH");
    console.log(data);
    console.log(" and socketid " + socket.id);

    if (!user_freq[socket.id]) user_freq[socket.id] = {};
    user_freq_map[socket.id] = new PriorityQueue(); //for storing users priority_wise.
    users[socket.id] = { socket, data, isConnected: false, matchId: null };

    //Updating tag_map with new tags
    for (var tag of data.tags) {
      if (!tag_map[tag]) tag_map[tag] = [];
      tag_map[tag].push(socket.id);
    }

    console.log(tag_map);

    for (var tag of data.tags) {
      for (let u of tag_map[tag]) {
        if (u === socket.id) continue;
        if (!user_freq[socket.id][u]) user_freq[socket.id][u] = 0;
        user_freq[socket.id][u]++;
        if (!user_freq[u][socket.id]) user_freq[u][socket.id] = 0;
        user_freq[u][socket.id]++;
      }
    }

    console.log(user_freq[socket.id]);

    for (let [key, val] of Object.entries(user_freq[socket.id])) {
      // if(users[key].isConnected === true)continue;
      user_freq_map[socket.id].enqueue(key, val);
      user_freq_map[key].enqueue(socket.id, val);
    }

    console.log(user_freq_map[socket.id]);

    // console.log(users[socket.id]);
    //emit waiting event

    socket.emit("waiting");
    searchUser(data);
  });

  socket.on("message", (message) => {
    let user = users[socket.id];
    console.log(user);
    if(user.matchId)console.log(socket.id + " sent: " + message + " to " + user.matchId);
    if (user && user.isConnected) {
      // console.log("INSIDE IF>>>>>>>");
      let match = users[user.matchId];
      // console.log(match);
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
    console.log(user_freq_map[socket.id]);
    let user = users[socket.id];
    if (user && user.isConnected) {
      let otherUser = users[user.matchId];
      if (otherUser) {
        otherUser.isConnected = false;
        otherUser.matchId = null;
        console.log(user_freq[user.socket.id][otherUser.socket.id]);
        user_freq[user.socket.id][otherUser.socket.id] /= 10;
        user_freq_map[user.socket.id].enqueue(otherUser.socket.id,user_freq[user.socket.id][otherUser.socket.id]);
        user_freq[otherUser.socket.id][user.socket.id] /= 10;
        user_freq_map[otherUser.socket.id].enqueue(user.socket.id,user_freq[otherUser.socket.id][user.socket.id]);
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
      delete user_freq[socket.id];
      delete user_freq_map[socket.id];
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
