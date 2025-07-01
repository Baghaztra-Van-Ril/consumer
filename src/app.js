import dotenv from 'dotenv';
dotenv.config();

import { createConsumer } from './queues/consumer.js';
import { handlePaymentLog } from './consumers/payment.consumer.js';
import { handlePaymentStatusUpdate } from './consumers/paymentStatus.consumer.js';

console.log('🚀 Consumer service started...');

await createConsumer('payment_log', handlePaymentLog);
await createConsumer('payment_status_update', handlePaymentStatusUpdate);
