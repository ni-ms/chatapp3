import { Server, Socket } from "socket.io";
import { PriorityQueue } from "./priority_queue";
import express from "express";
 
interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
  match: (matchId: string) => void;
  waiting: () => void;
  disconnect: () => void;
  registered: (data: any) => void;
}
 
interface ClientToServerEvents {
  hello: () => void;
  register: (data: any) => void;
  message: (message: any) => void;
  typing: () => void;
  stop_typing: () => void;
  skip: () => void;
  disconnect: () => void;
  leave_chat: () => void;
}
 
interface InterServerEvents {
  ping: () => void;
}
 
interface SocketData {
  name: string;
  age: number;
}
 
const app = express();
 
// Serve static files from the "public" directory
app.use(express.static(__dirname + "/public"));
 
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
 
const server = app.listen(3000, () => {
  console.log("listening on http://localhost:3000");
});
 
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
 
export class User {
  private _socket: Socket;
  private _tags: [];
  private _isConnected: boolean;
  private _matchSocket: Socket;
  private _potentialMatches: PriorityQueue<User>;
 
  constructor(socket: Socket, tags: []) {
    this._socket = socket;
    this._tags = tags;
    this._isConnected = false;
    // matchId is the socket.id of the user's match
    this._matchSocket = {} as Socket;
    this._potentialMatches = new PriorityQueue();
  }
 
  get socket(): Socket {
    return this._socket;
  }
 
  set socket(value: Socket) {
    this._socket = value;
  }
 
  get matchSocket(): Socket {
    return this._matchSocket;
  }
 
  set matchSocket(value: Socket) {
    this._matchSocket = value;
    this._isConnected = value !== null && value !== undefined;
  }
 
  get tags(): [] {
    return this._tags;
  }
 
  set tags(value: []) {
    this._tags = value;
  }
 
  get potentialMatches(): PriorityQueue<User> {
    return this._potentialMatches;
  }
 
  set potentialMatches(value: PriorityQueue<any>) {
    this._potentialMatches = value;
  }
 
  get isConnected(): boolean {
    return this._isConnected;
  }
 
  set isConnected(value: boolean) {
    this._isConnected = value;
  }
}
 
class Connections {
  // inner map is a map of user to weight. Useful for a global view of the graph
  private connections: Map<string, Map<User, number>>;
  private invertedIndex: Map<string, User[]>;
  private userIdToSocket: Map<string, User>;
  // private userWeight: Map<User,Map<User,number>>;
  constructor() {
    this.connections = new Map();
    this.invertedIndex = new Map();
    this.userIdToSocket = new Map();
    // this.userWeight = new Map();
  }
 
  getWeightByConnections(user1: User, user2: User) {
    if (!user1 || !user2) return;
    return this.connections.get(user1.socket.id)?.get(user2);
  }
 
  addUser(user: User) {
    if (!Array.isArray(user.tags)) {
      throw new Error("Tags must be an array");
    }
    this.connections.set(user.socket.id, new Map());
    for (let tag of user.tags) {
      if (!this.invertedIndex.has(tag)) {
        this.invertedIndex.set(tag, []);
      }
      this.invertedIndex.get(tag)!.push(user);
    }
    for (let otherUser of this.searchConnections(user)) {
      this.addConnection(user, otherUser);
    }
 
    this.userIdToSocket.set(user.socket.id, user);
    // this.printUserAndConnections();
  }
 
  printUserAndConnections() {
    console.log("************GRAPH**********");
    for (let [user, connections] of this.connections.entries()) {
      console.log(`${user}: `);
      for (let [otherUser, weight] of connections.entries()) {
        console.log(`{${otherUser.socket.id}, ${weight}},`);
      }
    }
  }
 
  searchConnections(user: User): Set<User> {
    let potentialUsers: Set<User> = new Set();
    for (let tag of user.tags) {
      let users = this.invertedIndex.get(tag);
      if (users) {
        for (let otherUser of users) {
          if (otherUser !== user) {
            potentialUsers.add(otherUser);
          }
        }
      }
    }
    return potentialUsers;
  }
 
  addConnection(user: User, otherUser: User) {
    if (!user || !otherUser) {
      throw new Error("User not found");
    }
    let weight = this.getWeight(user, otherUser);
 
    // if(!this.userWeight.has(user))this.userWeight.set(user,new Map());
    // else
    // {
    //     this.userWeight.get(user)?.set(otherUser,weight);
    // }
 
    if (weight === 0) {
      return;
    }
 
    let userConnections = this.connections.get(user.socket.id);
    let otherUserConnections = this.connections.get(otherUser.socket.id);
    if (!userConnections?.has(otherUser)) {
      userConnections?.set(otherUser, weight);
      otherUserConnections?.set(user, weight);
      let weight1 = userConnections?.get(otherUser);
      let weight2 = otherUserConnections?.get(user);
      if (
        weight1 === undefined ||
        weight2 === undefined ||
        weight1 === 0 ||
        weight2 === 0
      )
        return;
      user.potentialMatches.enqueue(
        otherUser,
        weight1,
        otherUser.socket,
        otherUser.socket.id
      );
      otherUser.potentialMatches.enqueue(
        user,
        weight2,
        user.socket,
        user.socket.id
      );
    }
  }
 
  removeUser(user: User) {
    this.connections.delete(user.socket.id);
    // Remove user from inverted index
    for (let [tag, users] of this.invertedIndex.entries()) {
      if (users.includes(user)) {
        users.splice(users.indexOf(user), 1);
        if (users.length === 0) {
          this.invertedIndex.delete(tag);
        }
      }
    }
    // Remove user from other users' connections
    for (let [otherUser, connections] of this.connections.entries()) {
      if (connections.has(user)) {
        connections.delete(user);
        let other = this.userIdToSocket.get(otherUser) as User;
        if (other) {
          other.potentialMatches.dequeue(user);
        }
      }
    }
  }
 
  getCommonTags(user1: User, user2: User) {
    return user1.tags.filter((tag) => user2.tags.includes(tag));
  }
 
  getWeight(user1: User, user2: User): number {
    let commonTags = this.getCommonTags(user1, user2);
    let totalTags = new Set([...user1.tags, ...user2.tags]).size;
    return commonTags.length / totalTags;
  }
 
  decreaseWeight(user1: User, user2: User) {
    const weight = this.getWeight(user1, user2);
    const decreasedWeight = weight * 0.1;
    this.connections.get(user1.socket.id)?.set(user2, decreasedWeight);
    this.connections.get(user2.socket.id)?.set(user1, decreasedWeight);
    // user1.potentialMatches.updatePriority(user2, decreasedWeight);
    // user2.potentialMatches.updatePriority(user1, decreasedWeight);
    return decreasedWeight;
  }
}
 
export class Logic {
  private graph: Connections;
  private socketMap: Map<Socket, User>;
 
  constructor() {
    this.graph = new Connections();
    this.socketMap = new Map();
  }
 
  registerUser(data: { socket: Socket; tags: any }) {
    console.log(
      `REGISTERING USER with socket id: ${data.socket.id} & tags:${data.tags}`
    );
    const user = new User(data.socket, data.tags);
    user.socket.emit("waiting");
    this.graph.addUser(user);
    this.socketMap.set(data.socket, user);
    this.graph.printUserAndConnections();
    this.searchForMatch(user);
    return user;
  }
 
  searchForMatch(user: User) {
    // if (user.isConnected) {
    //     console.log('User is already connected. Skipping search.');
    //     return;
    // }
    // let potentialMatches = this.graph.searchConnections(user);
    // for (let match of potentialMatches) {
    //     this.graph.addConnection(user, match);
    // }
    if (user.isConnected === true) return;
    console.log("SEARCHING.............");
    console.log(`Priority Queue:`, user.potentialMatches);
    console.log("DEKH BHAI..................");
    if(!user.potentialMatches.isEmpty())console.log(user.potentialMatches.peek().priority,this.graph.getWeightByConnections(user,user.potentialMatches.peek().user));
    let already_connected_user = [];
    while (
      !user.potentialMatches.isEmpty() &&
      (user.potentialMatches.peek().user.isConnected === true ||  user.potentialMatches.peek().priority != this.graph.getWeightByConnections(user,user.potentialMatches.peek().user))
    ) {
        console.log("DEKH BHAI ISKO............");
        console.log(user.potentialMatches.peek().priority,this.graph.getWeightByConnections(user,user.potentialMatches.peek().user));
      if(user.potentialMatches.peek().priority === this.graph.getWeightByConnections(user,user.potentialMatches.peek().user))already_connected_user.push(user.potentialMatches.peek());
      user.potentialMatches.dequeue();
    }
    let bestMatch = user.potentialMatches.dequeue() || undefined;
 
    console.log(`Matched with :`, bestMatch?.socket.id);
    if (bestMatch) {
      user.matchSocket = bestMatch.socket;
      bestMatch.matchSocket = user.socket;
      let matchingTags = bestMatch.tags.filter((tag) =>
        user.tags.includes(tag)
      );
      user.socket.emit("match", [bestMatch.socket.id, matchingTags]);
      bestMatch.socket.emit("match", [user.socket.id, matchingTags]);
    }
 
    while (already_connected_user.length != 0) {
      let item = already_connected_user.shift();
      if (item === undefined) continue;
      user.potentialMatches.enqueue(
        item?.user,
        item?.priority,
        item?.socket,
        item?.matchSocket
      );
    }
    console.log(`Priority Queue:`, user.potentialMatches);
  }
 
  skipUser(socket: Socket) {
    console.log("SKIPPING.........");
    const user = this.getUserBySocket(socket);
    console.log(`Skipping User:`, user.socket.id);
    if (user) {
      //   console.log(`User Priority_Queue: `,user.potentialMatches);
      const skippedUser = this.getUserBySocket(user.matchSocket);
      console.log(`Skipped User: ${skippedUser?.socket.id}`);
      //    skippedUser?.potentialMatches.dequeue();
      //   console.log(`Skipped User Priority_queue:`,skippedUser?.potentialMatches);
      if (skippedUser) {
        let weight = this.graph.decreaseWeight(user, skippedUser);
        console.log(weight);
        user.potentialMatches.enqueue(skippedUser,weight,skippedUser.socket,skippedUser.matchSocket);
        skippedUser.potentialMatches.enqueue(user,weight,user.socket,user.matchSocket);
      }
      if (user) user.isConnected = false;
      if (skippedUser) skippedUser.isConnected = false;
      if (skippedUser.isConnected === false)
        skippedUser?.socket.emit("waiting");
      user?.socket.emit("waiting");
      if (skippedUser) this.searchForMatch(skippedUser);
      if (user) this.searchForMatch(user);
      // const newMatch = user.potentialMatches.peek();
      // if (newMatch) {
      //     user.socket.emit('match', newMatch.socket.id);
      //     newMatch.socket.emit('match', user.socket.id);
      //     user.matchSocket = newMatch.socket.id;
      //     newMatch.matchSocket = user.socket.id;
      // } else {
      //     user.socket.emit('waiting');
      // }
    }
  }
 
  removeUser(socket: any) {
    const user = this.getUserBySocket(socket);
    if (user) {
      this.graph.removeUser(user);
      this.socketMap.delete(socket); // Remove the user from the socketMap
    }
  }
 
  sendMessage(user1: Socket, user2: Socket, message: string) {
    // user1.emit('message', message);
    user2.emit("message", message);
  }
 
  sendTyping(user1: Socket, user2: Socket) {
    user1.emit("typing");
    user2.emit("typing");
  }
 
  stopTyping(user1: Socket, user2: Socket) {
    user1.emit("stop_typing");
    user2.emit("stop_typing");
  }
 
  leaveChat(user1: Socket, user2: Socket) {
    user1.emit("leave_chat");
    user2.emit("leave_chat");
  }
 
  disconnect(user1: Socket, user2: Socket) {
    this.leaveChat(user1, user2);
    user1.emit("disconnect");
    user2.emit("disconnect");
  }
 
  getUserBySocket(socket: Socket): User {
    if (this.socketMap.get(socket)) {
      return <User>this.socketMap.get(socket);
    }
    return {} as User;
  }
}
 
const logic = new Logic();
io.on("connection", (socket) => {
  socket.on("register", (data) => {
    try {
      const user = logic.registerUser({ socket, tags: data.tags });
    } catch (error) {
      console.error(`Error in register event: ${error}`);
    }
  });
 
  socket.on("message", (message) => {
    try {
      const user = logic.getUserBySocket(socket);
      if (user && user.matchSocket) {
        logic.sendMessage(socket, user.matchSocket, message);
      }
    } catch (error) {
      console.error(`Error in message event: ${error}`);
    }
  });
 
  socket.on("skip", () => {
    try {
      const user = logic.getUserBySocket(socket);
      if (user && user.matchSocket) {
        logic.skipUser(socket);
      }
    } catch (error) {
      console.error(`Error in skipping event: ${error}`);
    }
  });
 
  socket.on("typing", () => {
    try {
      const user = logic.getUserBySocket(socket);
      if (user && user.matchSocket) {
        logic.sendTyping(socket, user.matchSocket);
      }
    } catch (error) {
      console.error(`Error in typing event: ${error}`);
    }
  });
 
  socket.on("stop_typing", () => {
    try {
      const user = logic.getUserBySocket(socket);
      if (user && user.matchSocket) {
        logic.stopTyping(socket, user.matchSocket);
      }
    } catch (error) {
      console.error(`Error in stop_typing event: ${error}`);
    }
  });
 
  socket.on("disconnect", () => {
    try {
      const user = logic.getUserBySocket(socket);
      if (user && user.matchSocket) {
        logic.disconnect(socket, user.matchSocket);
        logic.removeUser(socket);
      }
    } catch (error) {
      console.error(`Error in disconnect event: ${error}`);
    }
  });
 
  socket.on("leave_chat", () => {
    try {
      const user = logic.getUserBySocket(socket);
      if (user && user.matchSocket) {
        logic.leaveChat(socket, user.matchSocket);
      }
    } catch (error) {
      console.error(`Error in leave_chat event: ${error}`);
    }
  });
});
 