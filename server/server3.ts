import express = require("express");
import {Server} from "socket.io";
import {PriorityQueue} from './priority_queue';
import * as path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, '/../public')));
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/../public/index.html'));
    res.sendFile(path.join(__dirname, '/../public/styles.css'));
});

interface ServerToClientEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
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

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>();

class User {
    private _socket: any;
    private _tags: [];
    private _isConnected: boolean;
    private _matchId: null;
    private _potentialMatches: PriorityQueue<any>;

    constructor(socket: any, tags: []) {
        this._socket = socket;
        this._tags = tags
        this._isConnected = false;
        // matchId is the socket.id of the user's match
        this._matchId = null;
        this._potentialMatches = new PriorityQueue();
    }

    get socket(): any {
        return this._socket;
    }

    set socket(value: any) {
        this._socket = value;
    }

    get matchId(): null {
        return this._matchId;
    }

    set matchId(value: null) {
        this._matchId = value;
    }


    get tags(): [] {
        return this._tags;
    }

    set tags(value: []) {
        this._tags = value;
    }

    get potentialMatches(): PriorityQueue<any> {
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
    private connections: Map<User, Map<User, number>>;
    private invertedIndex: Map<string, User[]>;

    constructor() {
        this.connections = new Map();
        this.invertedIndex = new Map();
    }

    addUser(user: User) {
        this.connections.set(user, new Map());
        for (let tag of user.tags) {
            if (!this.invertedIndex.has(tag)) {
                this.invertedIndex.set(tag, []);
            }
            this.invertedIndex.get(tag)!.push(user);
        }
    }

    searchConnections(user: User): User[] {
        let potentialUsers: User[] = [];
        for (let tag of user.tags) {
            let users = this.invertedIndex.get(tag);
            if (users) {
                for (let otherUser of users) {
                    if (otherUser !== user) {
                        potentialUsers.push(otherUser);
                    }
                }
            }
        }
        return potentialUsers;
    }

    addConnection(user: User, otherUser: User) {
        let weight = this.getWeight(user, otherUser);
        if (!this.connections.get(user)?.has(otherUser)) {
            this.connections.get(user)?.set(otherUser, weight);
            user.potentialMatches.enqueue(otherUser, weight, otherUser.socket, otherUser.socket.id);
        } else {
            // not used
            this.connections.get(user)?.set(otherUser, weight);
            user.potentialMatches.updatePriority(otherUser, weight);
        }
    }

    addConnections(user: User, otherUsers: User[]) {
        for (let otherUser of otherUsers) {
            this.addConnection(user, otherUser);
            // check if no common tags -> not added to queue
        }
    }

    removeUser(user: User) {
        this.connections.delete(user);
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
                otherUser.potentialMatches.dequeue(user);
            }
        }
    }

    getCommonTags(user1: User, user2: User) {
        return user1.tags.filter(tag => user2.tags.includes(tag));
    }

    getWeight(user1: User, user2: User): number {
        let commonTags = this.getCommonTags(user1, user2);
        let totalTags = new Set([...user1.tags, ...user2.tags]).size;
        return commonTags.length / totalTags;
    }

}


class Logic {
    private graph: Connections;
    private socketMap: Map<any, User>;

    constructor() {
        this.graph = new Connections();
        this.socketMap = new Map();
    }

    registerUser(data: { socket: any; tags: any; }) {
        const user = new User(data.socket, data.tags);
        this.graph.addUser(user);
        this.socketMap.set(data.socket, user);
    }

    getUserBySocket(socket: any): User | null {
        return this.socketMap.get(socket) || null;
    }

    getSocketFromMatchId(matchId: string): any | null {
        const user = Array.from(this.socketMap.values()).find(user => user.socket.id === matchId);
        return user ? user.socket : null;
    }

    searchForMatch(user: User) {
        let potentialMatches = this.graph.searchConnections(user);
        this.graph.addConnections(user, potentialMatches);
        // optimize this
        let bestMatch = user.potentialMatches.dequeue();
        if (bestMatch) {
            this.emitMatch(user.socket, bestMatch.socket);
        }
    }

    emitMatch(currentUserSocket: any, bestMatchSocket: any) {
        const currentUser = this.getUserBySocket(currentUserSocket);
        const bestMatch = this.getUserBySocket(bestMatchSocket);

        if (currentUser && bestMatch) {
            currentUser.matchId = bestMatchSocket.id;
            bestMatch.matchId = currentUserSocket.id;

            currentUser.isConnected = true;
            bestMatch.isConnected = true;

            currentUserSocket.emit('match', bestMatchSocket.id);
            bestMatchSocket.emit('match', currentUserSocket.id);
        }
    }

    skipUser(socket: any) {
        const user = this.getUserBySocket(socket);
        if (user) {
            user.potentialMatches.dequeue();

            const newMatch = user.potentialMatches.peek();
            if (newMatch) {
                user.socket.emit('match', newMatch.socket.id);
                newMatch.socket.emit('match', user.socket.id);

                user.matchId = newMatch.socket.id;
                newMatch.matchId = user.socket.id;
            } else {
                // Emit 'waiting' event to the user
                user.socket.emit('waiting');
            }
        }
    }

    removeUser(socket: any) {
        const user = this.getUserBySocket(socket);
        if (user) {
            this.graph.removeUser(user);
            this.socketMap.delete(socket); // Remove the user from the socketMap
        }
    }
}

function isPopular(tag: any) {
    // ...
    console.log(tag);
}

const logic = new Logic();
io.on("connection", (socket) => {

    socket.on("register", (data) => {
        logic.registerUser({socket, tags: data.tags});
        logic.searchForMatch(new User(socket, data.tags));
    });

    socket.on("message", (message) => {
        // ...
    });

    socket.on("typing", () => {
        // ...
    });

    socket.on("stop_typing", () => {
        // ...
    });

    socket.on("skip", () => {
        // ...
    });

    socket.on("disconnect", () => {
        // ...
    });

    socket.on("leave_chat", () => {
        // ...
    });
});


function searchUser() {
    // ...
}

