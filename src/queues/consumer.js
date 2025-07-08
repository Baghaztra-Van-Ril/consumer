import { createConnection } from './connection.js';

const MAX_RETRY = 5;
const RETRY_TTL_MS = parseInt(process.env.RETRY_TTL_MS || '10000', 10);

export async function createConsumer(queue, handler) {
    const retryQueue = `${queue}_retry`;
    const retryExchange = `${queue}_retry_exchange`;

    const { channel } = await createConnection();

    // 🟩 Queue utama
    await channel.assertQueue(queue, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': retryExchange,
        },
    });

    // 🟨 Retry Exchange
    await channel.assertExchange(retryExchange, 'direct', { durable: true });

    // 🟧 Retry Queue
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
        if (msg !== null) {
            try {
                const data = JSON.parse(msg.content.toString());
                await handler(data, msg, channel);
                channel.ack(msg);
            } catch (err) {
                const headers = msg.properties.headers || {};
                const currentRetry = headers['x-retry-count'] || 0;

                const errorMessage = err.message.toLowerCase();

                if (
                    errorMessage.includes('unique constraint') &&
                    errorMessage.includes('orderid')
                ) {
                    console.warn(`⛔ Duplicate orderId, skipping retry: ${err.message}`);
                    channel.ack(msg);
                    return;
                }

                if (currentRetry >= MAX_RETRY) {
                    console.error(`🚫 Max retry reached (${MAX_RETRY}). Discarding message.`);
                    channel.ack(msg);
                    return;
                }

                const updatedHeaders = {
                    ...headers,
                    'x-retry-count': currentRetry + 1,
                };

                channel.publish(
                    '',
                    retryQueue,
                    msg.content,
                    {
                        headers: updatedHeaders,
                        persistent: true,
                    }
                );

                console.warn(`🔁 Retry #${currentRetry + 1} for message...`);
                channel.ack(msg);
            }
        }
    });

}
