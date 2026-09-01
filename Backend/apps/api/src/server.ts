import "dotenv/config";
import { buildApp } from "./app.js";

const start = async () => {
  const app = await buildApp();

  const PORT = app.config.PORT;

  const shutdown = async () => {
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error(err, "Failed to shut down server gracefully");
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await app.listen({
      port: PORT,
      host: "0.0.0.0",
    });

    app.log.info(`Server running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();