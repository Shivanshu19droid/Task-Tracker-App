import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import "./config/redis"; // importing it opens the connection

const start = async () => {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();