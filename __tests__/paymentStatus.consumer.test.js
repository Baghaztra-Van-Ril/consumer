process.env.NODE_ENV = 'test';

import { handlePaymentStatusUpdate } from '../src/consumers/paymentStatus.consumer.js';
import { prismaMaster } from '../src/config/prisma.js';

// Mock prisma
jest.mock('../src/config/prisma.js', () => ({
    prismaMaster: {
        transaction: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    },
}));

describe('handlePaymentStatusUpdate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not update if transaction is not found', async () => {
        prismaMaster.transaction.findUnique.mockResolvedValue(null);

        const data = { orderId: 'NOT_FOUND', paymentStatus: 'PAID' };
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        await handlePaymentStatusUpdate(data);

        expect(prismaMaster.transaction.update).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            '⚠️ Transaction not found for orderId: NOT_FOUND'
        );

        warnSpy.mockRestore();
    });

    it('should not update if payment status is already the same', async () => {
        prismaMaster.transaction.findUnique.mockResolvedValue({ paymentStatus: 'PAID' });

        const data = { orderId: 'NO_CHANGE', paymentStatus: 'PAID' };

        await handlePaymentStatusUpdate(data);

        expect(prismaMaster.transaction.update).not.toHaveBeenCalled();
    });

    it('should update payment status if different', async () => {
        prismaMaster.transaction.findUnique.mockResolvedValue({ paymentStatus: 'PENDING' });

        const data = { orderId: 'CHANGE_ME', paymentStatus: 'PAID' };
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await handlePaymentStatusUpdate(data);

        expect(prismaMaster.transaction.update).toHaveBeenCalledWith({
            where: { orderId: 'CHANGE_ME' },
            data: expect.objectContaining({
                paymentStatus: 'PAID',
                updatedAt: expect.any(Date),
            }),
        });

        expect(logSpy).toHaveBeenCalledWith('✅ Updated payment for CHANGE_ME');

        logSpy.mockRestore();
    });

    it('should throw and log if error occurs', async () => {
        prismaMaster.transaction.findUnique.mockRejectedValue(new Error('Simulated Error'));

        const data = { orderId: 'ERROR_CASE', paymentStatus: 'FAILED' };
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        await expect(handlePaymentStatusUpdate(data)).rejects.toThrow('Simulated Error');

        errorSpy.mockRestore();
    });
});
