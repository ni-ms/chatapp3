import { Logic, User } from './server3';

describe('Logic', () => {
    let logic: Logic;
    let mockSockets: any[];
    let mockTags: any[][];

    beforeEach(() => {
        logic = new Logic();
        mockSockets = [{}, {}, {}, {}]; // Mock socket objects
        mockTags = [['tag1', 'tag2'], ['tag2', 'tag3'], ['tag3', 'tag4'], ['tag4', 'tag1']]; // Mock tags
    });

    test('registerUser should add users and find matchings', () => {
        mockSockets.forEach((socket, index) => {
            logic.registerUser({ socket: socket, tags: mockTags[index] });
        });

        mockSockets.forEach((socket, index) => {
            const user = logic.getUserBySocket(socket);
            expect(user).not.toBeNull();
            expect(user?.tags).toEqual(mockTags[index]);
        });

        mockSockets.forEach((socket) => {
            const user = logic.getUserBySocket(socket);
            logic.searchForMatch(user);
            expect(user.matchId).not.toBeNull();
        });
    });
});