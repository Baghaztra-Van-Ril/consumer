import { createConnection } from './connection.js';

const MAX_RETRY = 5;
const RETRY_TTL_MS = parseInt(process.env.RETRY_TTL_MS || '10000', 10);

export async function createConsumer(queue, handler) {
    const retryQueue = `${queue}_retry`;
    const retryExchange = `${queue}_retry_exchange`;

    const { channel } = await createConnection();

    await channel.assertQueue(queue, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': retryExchange,
        },
    });

    await channel.assertExchange(retryExchange, 'direct', { durable: true });

    await channel.assertQueue(retryQueue, {
        durable: true,
        arguments: {
            'x-message-ttl': RETRY_TTL_MS,
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': queue,
        },
    });

    await channel.bindQueue(retryQueue, retryExchange, retryQueue);

    console.log(`📡 Listening on queue "${queue}"...`);

    channel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
            const data = JSON.parse(msg.content.toString());
            await handler(data, msg, channel);

            channel.ack(msg); // ✅ sukses, ACK
        } catch (err) {
            const headers = msg.properties.headers || {};
            const currentRetry = headers['x-retry-count'] || 0;

            const errorMessage = err.message.toLowerCase();

            if (
                errorMessage.includes('unique constraint') &&
                errorMessage.includes('orderid')
            ) {
                console.warn(`⛔ Duplicate orderId, skipping retry: ${err.message}`);
                return channel.ack(msg); // tidak retry
            }

            if (currentRetry >= MAX_RETRY) {
                console.error(`🚫 Max retry reached (${MAX_RETRY}). Discarding message.`);
                return channel.ack(msg); // Drop
            }

            const updatedHeaders = {
                ...headers,
                'x-retry-count': currentRetry + 1,
            };

            try {
                channel.publish(
                    '', // default exchange untuk routing-key langsung ke queue
                    retryQueue,
                    msg.content,
                    {
                        headers: updatedHeaders,
                        persistent: true,
                    }
                );

                console.warn(`🔁 Retry #${currentRetry + 1} for message...`);
                channel.ack(msg); // ✅ ACK hanya kalau publish retry sukses
            } catch (retryErr) {
                console.error(`❌ Failed to publish retry message: ${retryErr.message}`);
                // ❌ Jangan ACK supaya pesan tetap di queue
            }
        }
    }, { noAck: false }); // ✅ penting: manual ack
}
