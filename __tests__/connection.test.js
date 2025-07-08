process.env.RABBITMQ_URL = 'amqp://localhost';

import { createConnection } from '../src/queues/connection.js';
import amqp from 'amqplib';

jest.mock('amqplib');

describe('createConnection', () => {
    const mockChannel = { assertQueue: jest.fn() };
    const mockConnection = {
        createChannel: jest.fn().mockResolvedValue(mockChannel),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        amqp.connect.mockResolvedValue(mockConnection);
    });

    it('should connect and return connection and channel', async () => {
        const { connection, channel } = await createConnection();

        expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost');
        expect(connection).toBe(mockConnection);
        expect(channel).toBe(mockChannel);
    });

    it('should throw if connection fails', async () => {
        amqp.connect.mockRejectedValue(new Error('Connection failed'));

        await expect(createConnection()).rejects.toThrow('Connection failed');
    });
});
