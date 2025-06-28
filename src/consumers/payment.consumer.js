import { prismaMaster } from '../config/prisma.js';

export async function handlePaymentLog(data) {
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

    console.log('✅ Payment log saved:', data.orderId);
}
