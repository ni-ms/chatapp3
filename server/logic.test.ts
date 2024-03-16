import {Server} from 'socket.io';
import {createServer} from 'http';
import Client from 'socket.io-client';
import {Logic, User} from './server3';

describe('Logic', () => {
    let server: any;
    let client: any;
    let logic: Logic;
    let mockSockets: any[];
    let mockTags: any[][];

    beforeAll((done) => {
        const httpServer = createServer();
        server = new Server(httpServer);
        httpServer.listen(() => {
            const addressInfo = httpServer.address() as import('net').AddressInfo;
            const port = addressInfo.port;
            client = new (Client as any)(`http://localhost:${port}`);
            logic = new Logic();
            client.on('connect', done);
        });
    });

    afterAll(() => {
        server.close();
        client.close();
    });

    beforeEach(() => {
        mockSockets = [{}, {}, {}, {}]; // Mock socket objects
        mockTags = [['tag1', 'tag2'], ['tag2', 'tag3'], ['tag3', 'tag4'], ['tag4', 'tag1']]; // Mock tags
    });

    test('registerUser should add users and find matchings', () => {
        mockSockets.forEach((socket, index) => {
            logic.registerUser({socket: socket, tags: mockTags[index]});
        });

        mockSockets.forEach((socket, index) => {
            const user = logic.getUserBySocket(socket);
            expect(user).not.toBeNull();
            expect(user?.tags).toEqual(mockTags[index]);
        });

        mockSockets.forEach((socket) => {
            const user = logic.getUserBySocket(socket);
            logic.searchForMatch(user);
            expect(user.matchSocket).not.toBeNull();
        });
    });

    test('should register a user', (done) => {
        client.emit('register', {tags: ['tag1', 'tag2']});
        client.on('match', (matchId: any) => {
            expect(matchId).toBeDefined();
            done();
        });
    });
});