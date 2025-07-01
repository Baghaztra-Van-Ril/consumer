import { prismaMaster } from "../config/prisma.js";

export async function handlePaymentStatusUpdate(data) {
    const {
        orderId,
        transactionId,
        paymentType,
        paymentStatus,
        rawStatus
    } = data;

    try {
        const transaction = await prismaMaster.transaction.findUnique({
            where: { orderId },
        });

        if (!transaction) {
            console.warn(`[Consumer] Transaction not found: ${orderId}`);
            return;
        }

        if (transaction.paymentStatus === paymentStatus) {
            console.log(`[Consumer] Status already ${paymentStatus} for: ${orderId}`);
            return;
        }

        await prismaMaster.transaction.update({
            where: { orderId },
            data: {
                paymentStatus,
                paymentRef: transactionId,
                paymentMethod: paymentType,
                updatedAt: new Date(),
            },
        });

        if (transaction.paymentStatus !== "PAID" && paymentStatus === "PAID") {
            await prismaMaster.product.update({
                where: { id: transaction.productId },
                data: {
                    stock: { decrement: transaction.quantity },
                },
            });

            console.log(`✅ Stock updated & payment marked as PAID: ${orderId}`);
        } else {
            console.log(`✅ Payment status updated: ${orderId} → ${paymentStatus}`);
        }

    } catch (err) {
        console.error(`[Consumer] Error processing update for ${orderId}:`, err);
    }
}
