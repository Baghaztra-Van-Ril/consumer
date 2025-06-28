import { createConnection } from './connection.js';

export async function createConsumer(queue, handler) {
    const { channel } = await createConnection();
    await channel.assertQueue(queue, { durable: true });

    console.log(`📡 Listening on queue "${queue}"...`);

    channel.consume(queue, async (msg) => {
        if (msg !== null) {
            try {
                const data = JSON.parse(msg.content.toString());
                await handler(data);
                channel.ack(msg);
            } catch (err) {
                console.error(`❌ Error in consumer for queue "${queue}":`, err.message);
            }
        }
    });
}
