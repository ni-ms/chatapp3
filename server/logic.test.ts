import { io, Socket } from "socket.io-client";
import { Server } from "http";
const NUM_USERS = 4;
const TAGS = [["tag1", "tag2"], ["tag2", "tag3"], ["tag3", "tag4"], ["tag4", "tag1"]];

describe("Socket.io event tests", () => {
    let httpServer: Server;
    let ioServer: Server;

    beforeAll((done) => {
        httpServer = new Server(); // Create an HTTP server
        ioServer = new Server(httpServer);
        ioServer.on("connection", (socket) => {
            console.log(`New connection: ${socket}`);
        });
        httpServer.listen(3000, () => {
            console.log("HTTP server listening on port 3000");
            done();
        });
    });

    afterAll((done) => {
        ioServer.close();
        httpServer.close(done);
    });

    test("Register users and print matches", (done) => {
        const users: Socket[] = [];

        // Simulate users connecting
        for (let i = 0; i < NUM_USERS; i++) {
            const socket: Socket = io("http://localhost:3000", {
                forceNew: true,
                reconnection: false,
                transports: ["websocket"],
                query: { tags: TAGS[i].join(",") },
            });

            socket.on("connection", () => {
                console.log(`User ${i + 1} connected`);
                socket.emit("register", { tags: TAGS[i] });
            });

            socket.on("registered", () => {
                console.log(`User ${i + 1} registered`);
            });

            socket.on("waiting", () => {
                console.log(`User ${i + 1} is waiting`);
                users.push(socket);
                if (users.length === NUM_USERS) {
                    // All users are registered and waiting, now we can test matches
                    expect(users.length).toBe(NUM_USERS);

                    // Simulate matching process
                    users.forEach((user, index) => {
                        user.emit("register", { tags: TAGS[index] }); // Emit 'register' event with correct tags
                    });
                }
            });

            socket.on("match", (matchSocketId) => {
                console.log(`Match found for user ${i + 1}: ${matchSocketId}`);
                const index = users.findIndex(user => user.id === matchSocketId);
                if (index !== -1) {
                    const matchedUser = users.splice(index, 1)[0];
                    console.log(`Remaining users: ${users.map(user => user.id)}`);
                }

                if (users.length === 0) {
                    done(); // Finish the test once all matches are found
                }
            });
        }
    });
});
