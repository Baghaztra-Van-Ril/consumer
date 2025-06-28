import { PrismaClient } from '@prisma/client'
import dotenv from "dotenv";

dotenv.config();

const globalForPrisma = globalThis

const prismaMaster =
    globalForPrisma.prismaMaster ??
    new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    })

const prismaSlave =
    globalForPrisma.prismaSlave ??
    new PrismaClient({
        datasources: {
            db: {
                url: process.env.REPLICA_DATABASE_URL,
            },
        },
    })

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaMaster = prismaMaster
    globalForPrisma.prismaSlave = prismaSlave
}

export { prismaMaster, prismaSlave }
