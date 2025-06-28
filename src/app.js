import dotenv from 'dotenv';
dotenv.config();

import { createConsumer } from './queues/consumer.js';
import { handlePaymentLog } from './consumers/payment.consumer.js';

console.log('🚀 Consumer service started...');

await createConsumer('payment_log', handlePaymentLog);
