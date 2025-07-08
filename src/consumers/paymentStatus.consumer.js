import { prismaMaster } from "../config/prisma.js";

export async function handlePaymentStatusUpdate(data) {
    const { orderId, paymentStatus } = data;

    const transaction = await prismaMaster.transaction.findUnique({
        where: { orderId },
    });

    if (!transaction) {
        console.warn(`⚠️ Transaction not found for orderId: ${orderId}`);
        return;
    }

    if (transaction.paymentStatus === paymentStatus) return;

    await prismaMaster.transaction.update({
        where: { orderId },
        data: {
            paymentStatus,
            updatedAt: new Date(),
        },
    });

    console.log(`✅ Updated payment for ${orderId}`);
}
