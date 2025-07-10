import { prismaMaster } from "../config/prisma.js";

export async function handlePaymentStatusUpdate(data) {
    const { orderId, paymentStatus } = data;

    try {
        const transaction = await prismaMaster.transaction.findUnique({
            where: { orderId },
            include: {
                product: true,
            },
        });

        if (!transaction) {
            console.warn(`⚠️ Transaction not found for orderId: ${orderId}`);
            return;
        }

        if (transaction.paymentStatus === paymentStatus) {
            console.log(`ℹ️ Status pembayaran tidak berubah untuk orderId: ${orderId}`);
            return;
        }

        await prismaMaster.$transaction(async (tx) => {
            await tx.transaction.update({
                where: { orderId },
                data: {
                    paymentStatus,
                    updatedAt: new Date(),
                },
            });

            console.log(`✅ Updated payment status to "${paymentStatus}" for orderId: ${orderId}`);

            if (paymentStatus === "PAID") {
                await tx.product.update({
                    where: { id: transaction.productId },
                    data: {
                        stock: {
                            decrement: transaction.quantity,
                        },
                    },
                });

                console.log(`📦 Stok dikurangi: produk ID ${transaction.productId}, jumlah: ${transaction.quantity}`);
            }
        });
    } catch (err) {
        console.error(`❌ Error updating payment status for orderId: ${orderId}`);
        console.error(err);
    }
}
