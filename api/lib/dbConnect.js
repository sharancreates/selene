// api/lib/dbConnect.js
import mongoose from 'mongoose';

// 1. Cached connection variable
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // 2. If already connected, reuse it (Prevents hitting connection limits)
  if (cached.conn) {
    return cached.conn;
  }

  // 3. If no connection, create a new one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;