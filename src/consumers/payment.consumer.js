import { prismaMaster } from '../config/prisma.js';

export async function handlePaymentLog(data) {
    try {
        const existing = await prismaMaster.transaction.findUnique({
            where: { orderId: data.orderId },
        });

        if (existing) {
            console.info(`⚠️ Payment already exists: ${data.orderId}`);
            return;
        }

        await prismaMaster.transaction.create({
            data: {
                orderId: data.orderId,
                userId: data.userId,
                productId: data.productId,
                promoId: data.promoId || null,
                price: data.price,
                quantity: data.quantity,
                totalPrice: data.price * data.quantity,
                promoAmount: data.promoAmount || 0,
                finalAmount: data.finalAmount,
                paymentStatus: data.status || 'PENDING',
                paymentMethod: data.paymentMethod || 'midtrans',
                paymentRef: data.paymentRef || null,
                snapToken: data.snapToken || null,
                shipmentStatus: data.shipmentStatus || 'PENDING',
            },
        });

        console.info('✅ Payment log saved:', data.orderId);
    } catch (err) {
        console.error(`❌ Failed to save payment log for ${data.orderId}:`);
        throw err;
    }
}
