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

        let data;
        try {
            data = JSON.parse(msg.content.toString());
            await handler(data, msg, channel);

            channel.ack(msg);
        } catch (err) {
            const headers = msg.properties.headers || {};
            const currentRetry = headers['x-retry-count'] || 0;
            const orderId = (data && data.orderId) || 'Unknown';

            const errorMessage = err.message.toLowerCase();

            if (
                errorMessage.includes('unique constraint') &&
                errorMessage.includes('orderid')
            ) {
                console.warn(`⛔ Duplicate orderId "${orderId}", skipping retry: ${err.message}`);
                return channel.ack(msg);
            }

            if (currentRetry >= MAX_RETRY) {
                console.error(`🚫 Max retry reached (${MAX_RETRY}) for orderId "${orderId}". Discarding message.`);
                return channel.ack(msg);
            }

            const updatedHeaders = {
                ...headers,
                'x-retry-count': currentRetry + 1,
            };

            try {
                channel.publish(
                    '',
                    retryQueue,
                    msg.content,
                    {
                        headers: updatedHeaders,
                        persistent: true,
                    }
                );

                console.warn(
                    `🔁 Retry #${currentRetry + 1}/${MAX_RETRY} for orderId "${orderId}" on queue "${queue}". ` +
                    `Reason: ${err.message}`
                );

                channel.ack(msg);
            } catch (retryErr) {
                console.error(`❌ Failed to publish retry message: ${retryErr.message}`);
            }
        }
    }, { noAck: false });
}
