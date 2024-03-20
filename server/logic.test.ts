import { Logic } from "./server3";
import { io, Socket } from "socket.io-client";

describe('User Registration and Matching', () => {
    it('should register 5 users and print the match', () => {
        const logic = new Logic();

        // Register 5 users with different tags and unique client-side sockets
        const user1 = logic.registerUser({ socket: io() as any, tags: ['tag1', 'tag2'] });
        const user2 = logic.registerUser({ socket: io() as any, tags: ['tag2', 'tag3'] });
        const user3 = logic.registerUser({ socket: io() as any, tags: ['tag3', 'tag4'] });
        const user4 = logic.registerUser({ socket: io() as any, tags: ['tag4', 'tag5'] });
        // const user5 = logic.registerUser({ socket: io() as any, tags: ['tag6', 'tag1'] });

        // Search for match for each user
        logic.searchForMatch(user1);
        logic.searchForMatch(user2);
        logic.searchForMatch(user3);
        logic.searchForMatch(user4);


        // Print the match for each user
        console.log('User1 match:', user1.matchSocket);
        console.log('User2 match:', user2.matchSocket);
        console.log('User3 match:', user3.matchSocket);
        console.log('User4 match:', user4.matchSocket);


    });
});