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
            user.potentialMatches.enqueue(otherUser, weight);
        } else {
            this.connections.get(user)?.set(otherUser, weight);
            user.potentialMatches.updatePriority(otherUser, weight);
        }
    }

    addConnections(user: User, otherUsers: User[]) {
        for (let otherUser of otherUsers) {
            this.addConnection(user, otherUser);
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

    getWeight(user1: User, user2: User): number {
        let commonTags = this.getCommonTags(user1, user2);
        let totalTags = new Set([...user1.tags, ...user2.tags]).size;
        return commonTags.length / totalTags;
    }

}


class Logic {
    private graph: Connections;

    constructor() {
        this.graph = new Connections();

    }

    registerUser(data: { socket: any; tags: any; }) {
        const user = new User(data.socket, data.tags);
        this.graph.addUser(user);
    }


    removeUser(socket: any) {

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