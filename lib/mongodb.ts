import mongoose from "mongoose";

declare global {
    // eslint-disable-next-line no-var
    var mongoose: {
        conn: mongoose.Connection | null;
        promise: Promise<mongoose.Connection> | null;
    } | undefined;
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB(): Promise<mongoose.Connection> {
    // Check environment variable ONLY when calling the function
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is not defined in environment variables.");
    }

    // Return existing connection
    if (cached!.conn) {
        return cached!.conn;
    }

    // Create a new connection promise if it doesn't exist
    if (!cached!.promise) {
        const opts: mongoose.ConnectOptions = {
            bufferCommands: false,
        };

        cached!.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
            return mongooseInstance.connection;
        });
    }

    try {
        cached!.conn = await cached!.promise;
    } catch (err) {
        cached!.promise = null; // Reset to allow retry later
        throw err;
    }

    return cached!.conn;
}

export default connectDB;
