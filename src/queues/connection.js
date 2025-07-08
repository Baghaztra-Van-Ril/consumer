import amqp from "amqplib";

export async function createConnection() {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    console.log("🔗 Connected to RabbitMQ");
    return { connection, channel };
}
