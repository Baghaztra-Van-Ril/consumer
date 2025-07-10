import { prismaMaster } from '../config/prisma.js';

export async function waitForDatabase(maxRetries = 5, delayMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await prismaMaster.$queryRaw`SELECT 1`;
            console.log('✅ Database is ready');
            return;
        } catch (err) {
            console.warn(`⏳ Waiting for DB... (${i + 1}/${maxRetries})`);
            await new Promise(res => setTimeout(res, delayMs));
        }
    }

    throw new Error('❌ Database not reachable after retries');
}
