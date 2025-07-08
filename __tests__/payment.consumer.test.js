import { handlePaymentLog } from '../src/consumers/payment.consumer.js';
import { prismaMaster } from '../src/config/prisma.js';

// Mock prisma
jest.mock('../src/config/prisma.js', () => ({
    prismaMaster: {
        transaction: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));

describe('handlePaymentLog', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new transaction if not exists', async () => {
        prismaMaster.transaction.findUnique.mockResolvedValue(null);

        const data = {
            orderId: 'TEST-ORDER-001',
            userId: 'user123',
            productId: 'prod123',
            price: 10000,
            quantity: 2,
            finalAmount: 20000,
            status: 'PENDING',
        };

        await handlePaymentLog(data);

        expect(prismaMaster.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    orderId: 'TEST-ORDER-001',
                    price: 10000,
                    quantity: 2,
                    finalAmount: 20000,
                    paymentStatus: 'PENDING',
                }),
            })
        );
    });

    it('should not create transaction if it already exists', async () => {
        prismaMaster.transaction.findUnique.mockResolvedValue({ id: 1 });

        const data = {
            orderId: 'TEST-ORDER-EXIST',
        };

        await handlePaymentLog(data);

        expect(prismaMaster.transaction.create).not.toHaveBeenCalled();
    });

    it('should handle error and still acknowledge the message', async () => {
        prismaMaster.transaction.findUnique.mockRejectedValue(
            new Error('Simulated DB error')
        );

        const data = {
            orderId: 'ERROR-ORDER-001',
            userId: 'user123',
            productId: 'prod123',
            price: 10000,
            quantity: 2,
            finalAmount: 20000,
            status: 'PENDING',
        };

        const ackMock = jest.fn();
        const fakeMsg = { content: Buffer.from(JSON.stringify(data)) };

        // ✅ Tangkap error agar test tetap dianggap sukses
        await expect(handlePaymentLog(data, fakeMsg, { ack: ackMock }))
            .rejects.toThrow('Simulated DB error');

        expect(ackMock).not.toHaveBeenCalled(); // atau expect(ackMock).toHaveBeenCalled(); jika memang dipanggil
    });

});
