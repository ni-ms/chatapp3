import {Server, Socket} from "socket.io";
import {PriorityQueue} from './priority_queue';
import {parse, stringify} from 'flatted';
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
        methods: ["GET", "POST"]
    }
});

export class User {
    private _socket: Socket;
    private _tags: [];
    private _isConnected: boolean;
    private _matchSocket: Socket;
    private _potentialMatches: PriorityQueue<User>;

    constructor(socket: Socket, tags: []) {
        this._socket = socket;
        this._tags = tags
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


}

class Connections {
    // inner map is a map of user to weight. Useful for a global view of the graph
    private connections: Map<string, Map<User, number>>;
    private invertedIndex: Map<string, User[]>;
    private userIdToSocket: Map<string, User>;
    private addedUsers: Set<string>;


    constructor() {
        this.connections = new Map();
        this.invertedIndex = new Map();
        this.userIdToSocket = new Map();
        this.addedUsers = new Set();
    }

    addUser(user: User) {
        console.log('addUser - Adding user:', user.socket.id);
        console.log('addUser - User tags:', user.tags);
        if (!Array.isArray(user.tags)) {
            throw new Error("addUser - Tags must be an array");
        }
        this.connections.set(user.socket.id, new Map());
        console.log('addUser - User added to connections');
        for (let tag of user.tags) {
            if (!this.invertedIndex.has(tag)) {
                this.invertedIndex.set(tag, []);
            }
            this.invertedIndex.get(tag)!.push(user);
            console.log('addUser - User added to inverted index for tag:', tag);
        }


        // for (let [_, otherUser] of this.userIdToSocket.entries()) {
        //     if (this.getCommonTags(user, otherUser).length > 0) {
        //         this.addConnection(user, otherUser);
        //         console.log('addUser - Connection added between user:', user.socket.id, 'and other user:', otherUser.socket.id);
        //     }
        // }

        for (let tag of user.tags) {
            let users = this.invertedIndex.get(tag);
            if (users) {
                for (let otherUser of users) {
                    if (otherUser !== user) {
                        let userConnections = this.connections.get(user.socket.id);
                        if (userConnections && !userConnections.has(otherUser)) {
                            this.addConnection(user, otherUser);
                            console.log('addUser - Connection added between user:', user.socket.id, 'and other user:', otherUser.socket.id);
                        }
                    }
                }
            }
        }

        this.userIdToSocket.set(user.socket.id, user);
        console.log('addUser - User added to userIdToSocket');
    }

    printUserAndConnections() {
        console.log('<-- USER AND CONNECTIONS -->')
        for (let [user, connections] of this.connections.entries()) {
            console.log('User:', user);
            for (let [otherUser, weight] of connections.entries()) {
                console.log('Connection:', otherUser.socket.id, weight);
            }
        }
        console.log('<---------------->')
    }

    printInvertedIndex() {
        console.log('<-- INVERTED INDEX -->')
        for (let [tag, users] of this.invertedIndex.entries()) {
            console.log('Tag:', tag);
            for (let user of users) {
                console.log('User:', user.socket.id);
            }
        }
        console.log('<---------------->')
    }

    searchConnections(user: User): User[] {
        let potentialUsersSet = new Set<User>();
        for (let tag of user.tags) {
            let users = this.invertedIndex.get(tag);
            if (users) {
                for (let otherUser of users) {
                    if (otherUser !== user && !otherUser.isConnected) {
                        console.log('searchConnections - Potential user for ' + user.socket.id + 'is: ' + otherUser.socket.id)
                        potentialUsersSet.add(otherUser);
                    }
                }
            }
        }
        return Array.from(potentialUsersSet);
    }

    addConnection(user: User, otherUser: User) {
        if (!user || !otherUser) {
            throw new Error("addConnection - User not found");
        }
        let weight = this.getWeight(user, otherUser);
        console.log('addConnection - Weight between user:', user.socket.id, 'and other user:', otherUser.socket.id, 'is:', weight);
        if (weight === 0) {
            console.log('addConnection - Weight is 0');
            return;
        }
        let userConnections = this.connections.get(user.socket.id);
        let otherUserConnections = this.connections.get(otherUser.socket.id);
        if (userConnections === undefined || otherUserConnections === undefined) {
            throw new Error("addConnection - User connections not found");
        }
        // Check if the user has already been added to the queue
        if (this.addedUsers.has(otherUser.socket.id)) {
            console.log('addConnection - User:', otherUser.socket.id, 'has already been added to the queue. Skipping.');
            return;
        }

        if (!userConnections?.has(otherUser)) {
            userConnections?.set(otherUser, weight);
            otherUserConnections?.set(user, weight);
            user.potentialMatches.enqueue(otherUser, weight, otherUser.socket, otherUser.socket.id);
            otherUser.potentialMatches.enqueue(user, weight, user.socket, user.socket.id);
            console.log('addConnection - User added to other user connections');

            // Add the user to the Set of added users
            this.addedUsers.add(otherUser.socket.id);
        }
    }


    removeUser(user: User) {
        this.connections.delete(user.socket.id);
        console.log('removeUser - Inverted index:', this.invertedIndex);
        // Remove user from inverted index
        for (let [tag, users] of this.invertedIndex.entries()) {
            if (users.includes(user)) {
                console.log('removeUser - Removing user:', user.socket.id, 'from tag:', tag)
                users.splice(users.indexOf(user), 1);
                if (users.length === 0) {
                    console.log('No more users with tag:', tag)
                    this.invertedIndex.delete(tag);
                }
            }
        }
        console.log('removeUser - Inverted index after removing user:', JSON.stringify(this.invertedIndex));
        this.userIdToSocket.delete(user.socket.id);
        // Remove user from other users' connections
        console.log('removeUser - User:', user.socket.id, 'is being removed from connections', this.connections.entries());
        for (let [otherUser, connections] of this.connections.entries()) {
            if (connections.has(user)) {

                connections.delete(user);
                let other = this.userIdToSocket.get(otherUser) as User;
                console.log('removeUser - User:', user.socket.id, 'removed from connections of other user:', other.socket.id)
                if (other) {
                    other.potentialMatches.dequeue(user);
                }
            }
        }
        console.log('removeUser - User removed from connections:', this.connections.entries());
    }

    getCommonTags(user1: User, user2: User) {
        console.log('getCommonTags - User1 tags:', user1.tags);
        console.log('getCommonTags - User2 tags:', user2.tags);
        return user1.tags.filter(tag => user2.tags.includes(tag));
    }

    getWeight(user1: User, user2: User): number {
        let commonTags = this.getCommonTags(user1, user2);
        let totalTags = new Set([...user1.tags, ...user2.tags]).size;
        console.log('getWeight - Common tags:', commonTags);
        console.log('getWeight - Total tags:', totalTags);
        return commonTags.length / totalTags;
    }

    decreaseWeight(user1: User, user2: User) {
        const weight = this.getWeight(user1, user2);
        const decreasedWeight = weight - 0.1; // decrease by 10%
        this.connections.get(user1.socket.id)?.set(user2, decreasedWeight);
        this.connections.get(user2.socket.id)?.set(user1, decreasedWeight);
        user1.potentialMatches.updatePriority(user2, decreasedWeight);
        user2.potentialMatches.updatePriority(user1, decreasedWeight);
        console.log('decreaseWeight - Weight between user:', user1.socket.id, 'and other user:', user2.socket.id, 'is:', decreasedWeight, 'after decrease.', 'Old weight:', weight);
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

        const user = new User(data.socket, data.tags);
        user.isConnected = false;
        user.socket.emit('waiting');
        this.graph.addUser(user);
        this.socketMap.set(data.socket, user);

        // Print the user's potential matches
        // console.log('Current user priority queue:', stringify(user.potentialMatches));
        this.graph.printUserAndConnections();
        this.graph.printInvertedIndex();
        this.searchForMatch(user);
        return user;
    }

    searchForMatch(user: User) {
        if (user.isConnected) {
            console.log('SearchForMatch - User is already connected. Skipping search.');
            return;
        }
        let potentialMatches = this.graph.searchConnections(user);
        console.log('SearchForMatch - Potential matches:', potentialMatches)
        for (let match of potentialMatches) {
            this.graph.addConnection(user, match);
        }
        let bestMatch;
        let index = 0;
        do {
            bestMatch = user.potentialMatches.peekAt(index);
            index++;
        } while (bestMatch && bestMatch.user.isConnected);
        if (bestMatch && bestMatch.socket && bestMatch.isConnected === false) {
            console.log('SearchForMatch - Best match:', bestMatch.socket.id)
            user.matchSocket = bestMatch.socket;
            bestMatch.user.matchSocket = user.socket;
            user.isConnected = true;
            bestMatch.user.isConnected = true;
            user.socket.emit('match', bestMatch.socket.id);
            bestMatch.socket.emit('match', user.socket.id);
        }
    }

    skipUser(socket: Socket) {
        const user = this.getUserBySocket(socket);
        if (!user) {
            console.error('skipUser - User not found');
            return;
        }
        console.log('skipUser - User that is skipping:', user.socket.id)

        if (user.potentialMatches.isEmpty()) {
            console.error('skipUser - No potential matches for user');
            return;
        }

        const skippedUser = this.getUserBySocket(user.matchSocket);
        if (!skippedUser) {
            console.error('skipUser - Skipped user not found');
            return;
        }

        console.log('skipUser - Skipped user:', skippedUser.socket.id);
        console.log('skipUser - Old matchSocket for user:', user.matchSocket.id);
        console.log('skipUser - Old matchSocket for skipped user:', skippedUser.matchSocket.id);

        if (skippedUser) {
            skippedUser.socket.emit('skip');
            skippedUser.socket.emit('waiting');
            this.graph.decreaseWeight(user, skippedUser);
            this.skipConnectionEvents(user, skippedUser);
            skippedUser.potentialMatches.updatePriority(user, this.graph.getWeight(user, skippedUser)); // update the priority of the user in the other user's priority queue
            // search for a new user for the skipped user
            this.searchForMatch(skippedUser);
        }

        if (user.potentialMatches.isEmpty()) {
            console.log('skipUser - No more matches for user');
            user.socket.emit('waiting');
            this.searchForMatch(user);
            return;
        }

        const newMatch = user.potentialMatches.peek().user as User;
        if (newMatch) {
            user.socket.emit('match', newMatch.socket.id);
            newMatch.socket.emit('match', user.socket.id);
            user.matchSocket = newMatch.socket;
            newMatch.matchSocket = user.socket;
        } else {
            user.socket.emit('waiting');
            this.searchForMatch(user);
        }

        console.log('skipUser - New matchSocket for user:', user.matchSocket.id);
        console.log('skipUser - New matchSocket for new match:', newMatch.matchSocket.id);
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
        console.log('sendMessage - Sender:', sender.socket.id, 'Recipient:', recipient.socket.id);

        // Check if the recipient is the current match of the sender
        if (sender && recipient && sender.matchSocket.id === recipient.socket.id) {
            console.log('sendMessage - Sending message:', message, 'from user:', user1.id, 'to user:', user2.id);
            user2.emit('message', message);
        } else {
            console.log('sendMessage - Message not sent. The recipient is not the current match of the sender.');
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
    }
}

const logic = new Logic();
io.on("connection", (socket) => {

    socket.on("register", (data) => {
        try {
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

