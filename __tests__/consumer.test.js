process.env.NODE_ENV = 'test';
process.env.RETRY_TTL_MS = '5000';

import { createConsumer } from '../src/queues/consumer.js';
import { createConnection } from '../src/queues/connection.js';

// Mock createConnection to provide a fake channel
jest.mock('../src/queues/connection.js', () => ({
    createConnection: jest.fn(),
}));

describe('createConsumer', () => {
    const queue = 'test_queue';
    const mockHandler = jest.fn();

    const fakeChannel = {
        assertQueue: jest.fn(),
        assertExchange: jest.fn(),
        bindQueue: jest.fn(),
        consume: jest.fn(),
        ack: jest.fn(),
        publish: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        createConnection.mockResolvedValue({ channel: fakeChannel });
    });

    it('should setup queues and consume messages', async () => {
        await createConsumer(queue, mockHandler);

        expect(fakeChannel.assertQueue).toHaveBeenCalledWith(queue, expect.any(Object));
        expect(fakeChannel.assertExchange).toHaveBeenCalled();
        expect(fakeChannel.assertQueue).toHaveBeenCalledWith(`${queue}_retry`, expect.any(Object));
        expect(fakeChannel.bindQueue).toHaveBeenCalled();
        expect(fakeChannel.consume).toHaveBeenCalledWith(queue, expect.any(Function));
    });

    it('should retry message on handler failure with retry count', async () => {
        const handler = jest.fn().mockRejectedValue(new Error('Something failed'));

        await createConsumer(queue, handler);
        const consumerCallback = fakeChannel.consume.mock.calls[0][1];

        const fakeMsg = {
            content: Buffer.from(JSON.stringify({ orderId: 'RETRY_1' })),
            properties: { headers: {} },
        };

        await consumerCallback(fakeMsg);

        expect(fakeChannel.publish).toHaveBeenCalledWith(
            '',
            `${queue}_retry`,
            fakeMsg.content,
            expect.objectContaining({
                headers: expect.objectContaining({ 'x-retry-count': 1 }),
            })
        );

        expect(fakeChannel.ack).toHaveBeenCalledWith(fakeMsg);
    });

    it('should skip retry if unique constraint on orderId is found', async () => {
        const handler = jest.fn().mockRejectedValue(
            new Error('Unique constraint failed on the fields: (`orderId`)')
        );

        await createConsumer(queue, handler);
        const consumerCallback = fakeChannel.consume.mock.calls[0][1];

        const fakeMsg = {
            content: Buffer.from(JSON.stringify({ orderId: 'DUPLICATE' })),
            properties: { headers: {} },
        };

        await consumerCallback(fakeMsg);

        expect(fakeChannel.publish).not.toHaveBeenCalled();
        expect(fakeChannel.ack).toHaveBeenCalledWith(fakeMsg);
    });

    it('should discard message after max retry reached', async () => {
        const handler = jest.fn().mockRejectedValue(new Error('Still failing'));

        await createConsumer(queue, handler);
        const consumerCallback = fakeChannel.consume.mock.calls[0][1];

        const fakeMsg = {
            content: Buffer.from(JSON.stringify({ orderId: 'MAX_RETRY' })),
            properties: { headers: { 'x-retry-count': 5 } },
        };

        await consumerCallback(fakeMsg);

        expect(fakeChannel.publish).not.toHaveBeenCalled();
        expect(fakeChannel.ack).toHaveBeenCalledWith(fakeMsg);
    });

    it('should ignore null message', async () => {
        const handler = jest.fn();

        await createConsumer(queue, handler);
        const consumerCallback = fakeChannel.consume.mock.calls[0][1];

        // Simulasikan null message
        await consumerCallback(null);

        expect(handler).not.toHaveBeenCalled();
    });



});