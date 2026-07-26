import "reflect-metadata";
import app from "./app";
import config from "./config/env";
import { connectDatabase } from "./config/database";
import logger from "./config/logger";
import { scheduleAbandonedCartJob } from "./jobs/abandonedCart.job";

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Background jobs
    scheduleAbandonedCartJob();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(
        `🚀 Server running on port ${config.port} in ${config.env} mode`
      );
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📝 API available at http://localhost:${config.port}/api`);
      console.log(`❤️  Health check at http://localhost:${config.port}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server`);
      server.close(async () => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
