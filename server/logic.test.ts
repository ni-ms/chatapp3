import { io, Socket } from "socket.io-client";
const NUM_USERS = 4;
const TAGS = [["tag1", "tag2"], ["tag2", "tag3"], ["tag3", "tag4"], ["tag4", "tag1"]];
describe("Socket.io event tests", () => {
    test("Register users and print matches", (done) => {
        const users: Socket[] = [];
        let matches = 0;

        // Simulate users connecting
        for (let i = 0; i < NUM_USERS; i++) {
            const socket: Socket = io("http://localhost:3000", {
                forceNew: true,
                reconnection: false,
                transports: ["websocket"],
                query: { tags: TAGS[i].join(",") },
            });

            socket.on("connect", () => {
                console.log(`User ${i + 1} connected`);
                socket.emit("register", { tags: TAGS[i] });
            });

            socket.on("waiting", () => {
                console.log(`User ${i + 1} is waiting`);
                users.push(socket);
                if (users.length === NUM_USERS) {
                    // All users are registered and waiting, now we can test matches
                    expect(users.length).toBe(NUM_USERS);
                }
            });

            socket.on("match", (matchSocketId) => {
                console.log(`Match found for user ${i + 1}: ${matchSocketId}`);
                const index = users.findIndex(user => user.id === matchSocketId);
                matches++;
                if (index !== -1) {
                    const matchedUser = users.splice(index, 1)[0];
                    console.log(`Remaining users: ${users.map(user => user.id)}`);
                }

                if (matches === 4) {
                    done(); // Finish the test once all matches are found
                }
            });
        }
    },10000);
});