import {Server, Socket} from "socket.io";
import {PriorityQueue} from './priority_queue';
import express from "express";
import { Logger, ILogObj } from "tslog";
const log: Logger<ILogObj> = new Logger();


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
app.use(express.static(__dirname + '/public'));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});
const server = app.listen(3000, () => {
    console.log("listening on http://localhost:3000");
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
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
        this._isConnected = value !== {} as Socket;
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

    printPriorityQueue() {
        let queueString = '';
        for (let i = 0; i < this._potentialMatches.size(); i++) {
            let item = this._potentialMatches.peekAt(i);
            queueString += `${item.user.socket.id} - ${item.priority}, `;
        }
        console.log('Priority Queue:', queueString.slice(0, -2));
    }

}

class Connections {
    private connections: Map<string, Map<User, number>>;
    private invertedIndex: Map<string, User[]>;
    private userIdToSocket: Map<string, User>;

    constructor() {
        this.connections = new Map();
        this.invertedIndex = new Map();
        this.userIdToSocket = new Map();
    }

    addUser(user: User) {
        log.info(`Attempting to add user with socket id: ${user.socket.id}`);
        if (!Array.isArray(user.tags)) {
            log.error("Tags must be an array");
            throw new Error("Tags must be an array");
        }
        this.connections.set(user.socket.id, new Map());
        this.addUserToInvertedIndex(user);
        this.addConnectionsForUser(user);
        this.userIdToSocket.set(user.socket.id, user);
        log.info(`User with socket id: ${user.socket.id} has been added`);
    }

    private addUserToInvertedIndex(user: User) {
        for (let tag of user.tags) {
            if (!this.invertedIndex.has(tag)) {
                this.invertedIndex.set(tag, []);
            }
            this.invertedIndex.get(tag)!.push(user);
        }
    }

    private addConnectionsForUser(user: User) {
        let connectionSet = this.searchConnections(user);
        for (let otherUser of connectionSet) {
            this.addConnection(user, otherUser);
        }
    }

    searchConnections(user: User): Set<User>{
        let potentialUsersSet = new Set<User>();
        for (let tag of user.tags) {
            let users = this.invertedIndex.get(tag);
            if (users) {
                for (let otherUser of users) {
                    if (otherUser !== user) {
                        potentialUsersSet.add(otherUser);
                    }
                }
            }
        }
        return potentialUsersSet;
    }

    addConnection(user: User, otherUser: User) {
        log.info(`Attempting to add connection between user: ${user.socket.id} and user: ${otherUser.socket.id}`);
        if (!user || !otherUser) {
            log.error("User not found");
            throw new Error("User not found");
        }
        let weight = this.getWeight(user, otherUser);
        if (weight === 0) {
            log.info(`No weight found for connection between user: ${user.socket.id} and user: ${otherUser.socket.id}`);
            return;
        }
        let userConnections = this.connections.get(user.socket.id);
        let otherUserConnections = this.connections.get(otherUser.socket.id);
        if (!userConnections?.has(otherUser)) {
            userConnections?.set(otherUser, weight);
            otherUserConnections?.set(user, weight);
            user.potentialMatches.enqueue(otherUser, weight, otherUser.socket, otherUser.socket.id);
            otherUser.potentialMatches.enqueue(user, weight, user.socket, user.socket.id);
            log.info(`Connection added between user: ${user.socket.id} and user: ${otherUser.socket.id}`);
        } else {
            log.info(`Connection already exists between user: ${user.socket.id} and user: ${otherUser.socket.id}`);
        }
    }

    removeUser(user: User) {
        this.connections.delete(user.socket.id);
        this.removeUserFromInvertedIndex(user);
        this.userIdToSocket.delete(user.socket.id);
        this.removeUserFromConnections(user);
    }

    private removeUserFromInvertedIndex(user: User) {
        for (let [tag, users] of this.invertedIndex.entries()) {
            if (users.includes(user)) {
                users.splice(users.indexOf(user), 1);
                if (users.length === 0) {
                    this.invertedIndex.delete(tag);
                }
            }
        }
    }

    private removeUserFromConnections(user: User) {
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
        return user1.tags.filter(tag => user2.tags.includes(tag));
    }

    getWeight(user1: User, user2: User): number {
        let commonTags = this.getCommonTags(user1, user2);
        let totalTags = new Set([...user1.tags, ...user2.tags]).size;
        return commonTags.length / totalTags;
    }

    getWeightByConnections(user1: User, user2: User): number {
        let connections = this.connections.get(user1.socket.id);
        if (connections && connections.has(user2)) {
            return connections.get(user2) as number;
        }
        return 0;
    }

    decreaseWeight(user1: User, user2: User) {
        const weight = this.getWeight(user1, user2);
        const decreasedWeight = weight * 0.1; // decrease by 10%
        this.connections.get(user1.socket.id)?.set(user2, decreasedWeight);
        this.connections.get(user2.socket.id)?.set(user1, decreasedWeight);
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

    registerUser(data: { socket: Socket; tags: any; }) {
        log.info(`Registering user with socket id: ${data.socket.id}`);
        const user = new User(data.socket, data.tags);
        user.socket.emit('waiting');
        this.graph.addUser(user);
        this.socketMap.set(data.socket, user);
        log.info(`User with socket id: ${data.socket.id} has been registered and added to the graph`);
        this.searchForMatch(user);
        return user;
    }

    searchForMatch(user: User) {
        try {
            log.info(`Searching for a match for user: ${user.socket.id}`);
            if(user.matchSocket.id === undefined){
                user.isConnected = false;
            }
            if (user.isConnected) {
                log.warn(`User: ${user.socket.id} is already connected with user: ${user.matchSocket.id}`);
                return;
            }
            if(user.potentialMatches.size() === 0){
                log.warn(`User: ${user.socket.id} has no potential matches`);
                return;
            }
            let bestMatch;
            let index = 0;
            while (user.potentialMatches.peekAtUser(index)?.isConnected) {
                index++;
            }
            bestMatch = user.potentialMatches.peekAtUser(index);

            if (bestMatch && bestMatch.socket && !bestMatch.isConnected) {
                log.info(`Found a match for user: ${user.socket.id} with user: ${bestMatch.socket.id}`);
                user.matchSocket = bestMatch.socket;
                bestMatch.matchSocket = user.socket;
                user.isConnected = true;
                bestMatch.isConnected = true;
                let matchingTags = this.graph.getCommonTags(user, bestMatch);
                user.socket.emit('match', [bestMatch.socket.id, matchingTags]);
                bestMatch.socket.emit('match', [user.socket.id, matchingTags]);
            } else {
                log.info(`No match found for user: ${user.socket.id}`);
            }
        } catch (error) {
            log.error(`Error in searchForMatch for user: ${user.socket.id}. Error: ${error}`);
        }
    }

    skipUser(socket: Socket) {

        log.info(`Attempting to skip user with socket id: ${socket.id}`);
        const user = this.getUserBySocket(socket);
        const skippedUser = this.getUserBySocket(user?.matchSocket);
        this.skipConnectionEvents(user, skippedUser);
        if (!user || !skippedUser) {
            log.warn(`User or skipped user not found for socket id: ${socket.id}`);
            return;
        }
        log.info(`Skipping user: ${user.socket.id} for user: ${skippedUser.socket.id}`);
        skippedUser.socket.emit('skip');
        let weight = this.graph.decreaseWeight(user, skippedUser);
        user.potentialMatches.dequeue(skippedUser);
        skippedUser.potentialMatches.dequeue(user);
        user.potentialMatches.enqueue(skippedUser, weight, skippedUser.socket, skippedUser.matchSocket);
        skippedUser.potentialMatches.enqueue(user, weight, user.socket, user.matchSocket);
        skippedUser.socket.emit("waiting");
        user.socket.emit("waiting");
        log.info(`Searching for a match for skipped user: ${skippedUser.socket.id}`);
        this.searchForMatch(skippedUser);
        log.info(`Searching for a match for user: ${user.socket.id}`);
        this.searchForMatch(user);
    }
    removeUser(socket: any) {
        const user = this.getUserBySocket(socket);
        if (user) {
            this.graph.removeUser(user);
            this.socketMap.delete(socket);
        }
    }

    sendMessage(user1: Socket, user2: Socket, message: string) {
        const sender = this.getUserBySocket(user1);
        const recipient = this.getUserBySocket(user2);

        if (sender && recipient && sender.matchSocket.id === recipient.socket.id) {
            user2.emit('message', message);
        }
    }

    sendTyping(user1: Socket, user2: Socket) {
        user1.emit('typing');
        user2.emit('typing');
    }

    stopTyping(user1: Socket, user2: Socket) {
        user1.emit('stop_typing');
        user2.emit('stop_typing');
    }

    leaveChat(user1: Socket, user2: Socket) {
        user1.emit('leave_chat');
        user2.emit('leave_chat');
    }

    disconnectEvent(user1: Socket, user2: Socket) {
        this.leaveChat(user1, user2);
        user1.disconnect(true); // disconnect the socket
        user2.disconnect(true); // disconnect the socket
    }

    getUserBySocket(socket: Socket): User {
        if (this.socketMap.get(socket)) {
            return <User>this.socketMap.get(socket);
        }
        return {} as User;
    }

    private skipConnectionEvents(user: User, skippedUser: User) {
        user.isConnected = false;
        skippedUser.isConnected = false;
        user.matchSocket = {} as Socket;
        skippedUser.matchSocket = {} as Socket;
        user.potentialMatches.editUserConnectionStatus(skippedUser, false);
        skippedUser.potentialMatches.editUserConnectionStatus(user, false);
    }
}

const logic = new Logic();
io.on("connection", (socket) => {

    socket.on("register", (data) => {
        try {
            if (!data || !data.tags) {
                console.error('Data or tags are undefined');
                return;
            }
            const user = logic.registerUser({socket, tags: data.tags});
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
            logic.skipUser(socket);
        } catch (error) {
            console.error(`Error in skip event: ${error}`);
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
                logic.disconnectEvent(socket, user.matchSocket);
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

