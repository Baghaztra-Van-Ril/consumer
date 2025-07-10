process.env.NODE_ENV = 'test';

import { handlePaymentStatusUpdate } from '../src/consumers/paymentStatus.consumer.js';
import { prismaMaster } from '../src/config/prisma.js';

// Mock prisma
jest.mock('../src/config/prisma.js', () => ({
    prismaMaster: {
        $transaction: jest.fn(),
        transaction: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        product: {
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
        expect(warnSpy).toHaveBeenCalledWith('⚠️ Transaction not found for orderId: NOT_FOUND');

        warnSpy.mockRestore();
    });

    it('should not update if payment status is already the same', async () => {
        prismaMaster.transaction.findUnique.mockResolvedValue({ paymentStatus: 'PAID' });
        const data = { orderId: 'NO_CHANGE', paymentStatus: 'PAID' };
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await handlePaymentStatusUpdate(data);

        expect(prismaMaster.transaction.update).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith('ℹ️ Status pembayaran tidak berubah untuk orderId: NO_CHANGE');

        logSpy.mockRestore();
    });

    it('should update payment status if different', async () => {
        prismaMaster.transaction.findUnique.mockResolvedValue({
            orderId: 'CHANGE_ME',
            paymentStatus: 'PENDING',
            productId: 1,
            quantity: 2,
        });

        prismaMaster.$transaction.mockImplementation(async (callback) => {
            return await callback({
                transaction: {
                    update: prismaMaster.transaction.update,
                },
                product: {
                    update: prismaMaster.product.update,
                },
            });
        });

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

        expect(prismaMaster.product.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: {
                stock: {
                    decrement: 2,
                },
            },
        });

        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('✅ Updated payment status to "PAID" for orderId: CHANGE_ME')
        );
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('📦 Stok dikurangi')
        );

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
