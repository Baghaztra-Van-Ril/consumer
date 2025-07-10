import amqp from "amqplib";

let connection;
let channel;

export async function createConnection() {
    if (connection && channel) {
        return { connection, channel };
    }

    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    console.log('🔗 Connected to RabbitMQ');

    return { connection, channel };
}