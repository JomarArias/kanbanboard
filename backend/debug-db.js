import mongoose from "mongoose";
import "dotenv/config";

console.log("Starting debug script...");
const uri = process.env.MONGO_URI;
console.log("URI from env:", uri ? uri.replace(/:([^:@]+)@/, ":****@") : "undefined"); // Hide password

if (!uri) {
    console.error("MONGO_URI not found in environment variables");
    process.exit(1);
}

// Set a timeout for connection
const timeout = 10000;
const timer = setTimeout(() => {
    console.error(`Connection timed out after ${timeout}ms`);
    process.exit(1);
}, timeout);

mongoose.connect(uri)
    .then((conn) => {
        clearTimeout(timer);
        console.log("Connected to MongoDB successfully!");
        console.log("Database Name:", conn.connection.name);
        console.log("Host:", conn.connection.host);
        console.log("Port:", conn.connection.port);
        return conn.disconnect();
    })
    .then(() => {
        console.log("Disconnected.");
        process.exit(0);
    })
    .catch((err) => {
        clearTimeout(timer);
        console.error("Error connecting to MongoDB:", err.message);
        process.exit(1);
    });
