import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    MONGODB_URI: z.string().url("MONGODB_URI must be a valid connection URL"),
    JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters long"),
    GOOGLE_AI_KEY: z.string().min(1, "GOOGLE_AI_KEY is required"),
    REDIS_HOST: z.string().default("127.0.0.1"),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    CORS_ORIGIN: z.string().default("*"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables configuration:\n", JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
}

export const env = parsed.data;
