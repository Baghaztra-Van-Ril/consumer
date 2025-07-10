import dotenv from 'dotenv';
dotenv.config();

import { createConsumer } from './queues/consumer.js';
import { handlePaymentLog } from './consumers/payment.consumer.js';
import { handlePaymentStatusUpdate } from './consumers/paymentStatus.consumer.js';
import { waitForDatabase } from './utils/waitForDatabase.js';


console.log('🚀 Consumer service started...');
await waitForDatabase();
await createConsumer('payment_log', handlePaymentLog);
await createConsumer('payment_status_update', handlePaymentStatusUpdate);
