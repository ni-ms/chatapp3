import express = require("express");
import {PriorityQueue} from './priority_queue';

const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
import {Server} from "socket.io";

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
    private isConnected: boolean;
    private _matchId: null;
    private _potentialMatches: PriorityQueue<any>;

    constructor(socket: any, tags: []) {
        this._socket = socket;
        this._tags = tags
        this.isConnected = false;
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
        for (let tag of user.tags) {
            let usersWithSameTag = this.invertedIndex.get(tag);
            if (usersWithSameTag) {
                for (let otherUser of usersWithSameTag) {
                    if (otherUser !== user) {
                        let commonTagCount = this.getCommonTags(user, otherUser).length;
                        this.addConnection(user, otherUser, commonTagCount);
                    }
                }
            }
        }
    }

    removeUser(user: User) {
        this.connections.delete(user);
        for (let [tag, users] of this.invertedIndex.entries()) {
            if (users.includes(user)) {
                users.splice(users.indexOf(user), 1);
                if (users.length === 0) {
                    this.invertedIndex.delete(tag);
                }
            }
        }
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

    addConnection(user1: User, user2: User, weight: number) {
        if (!this.connections.has(user1)) {
            this.connections.set(user1, new Map());
        }
        this.connections.get(user1)!.set(user2, weight);
        user1.potentialMatches.enqueue(user2, weight);
    }

    removeConnection(user1: User, user2: User) {
        this.connections.get(user1)?.delete(user2);
        user1.potentialMatches.dequeue(user2);
    }

    getConnections(user: User): Map<User, number> | undefined {
        return this.connections.get(user);
    }
}


class Logic {
    private graph: Connections;
    private tagIndex: Map<string, User[]>;

    constructor() {
        this.graph = new Connections();
        this.tagIndex = new Map();
    }

    registerUser(data: { socket: any; tags: any; }) {
        const user = new User(data.socket, data.tags);
        for (let tag of user.tags) {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, []);
            }
            this.tagIndex.get(tag)!.push(user);
        }
        this.graph.addUser(user);
    }

    getUsersWithTag(tag: string) {
        return this.tagIndex.get(tag) || [];
    }

    getCommonTags(user1: User, user2: User) {
        return user1.tags.filter(tag => user2.tags.includes(tag));
    }

    findMatch(user: User) {
        let potentialMatches = user.potentialMatches;
        while (!potentialMatches.isEmpty()) {
            let match = potentialMatches.dequeue();
            if (match) {
                if (match.potentialMatches.peek().value === user) {
                    emitMatch(user.socket, match.socket);
                    user.matchId = match.socket.id;
                    match.matchId = user.socket.id;
                    break;
                }
            }
        }
    }

    removeUser(socket: any) {
        let user;
        for (let users of this.tagIndex.values()) {
            let foundUser = users.find(u => u.socket === socket);
            if (foundUser) {
                user = foundUser;
                break;
            }
        }
        if (user) {
            for (let [tag, users] of this.tagIndex.entries()) {
                if (users.includes(user)) {
                    users.splice(users.indexOf(user), 1);
                    if (users.length === 0) {
                        this.tagIndex.delete(tag);
                    }
                }
            }
            this.graph.removeUser(user);
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

function emitMatch(currentUserSocket: any, bestMatch: any) {
    // ...
    console.log(currentUserSocket, bestMatch);
}