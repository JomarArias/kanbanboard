import mongoose from "mongoose";
import "dotenv/config";

const uri = process.env.MONGO_URI;
console.log("URI from env:", uri);

if (!uri) {
    console.error("MONGO_URI not found in environment variables");
    process.exit(1);
}

mongoose.connect(uri)
    .then((conn) => {
        console.log("Connected to MongoDB");
        console.log("Database Name:", conn.connection.name);
        console.log("Host:", conn.connection.host);
        console.log("Port:", conn.connection.port);
        process.exit(0);
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1);
    });
