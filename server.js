import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { status } from "minecraft-server-util";
import { createLogger, format, transports } from "winston";

const app = express();

// Konfigurasi Winston Logger
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: "error.log", level: "error" }),
    new transports.File({ filename: "combined.log" }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

// Konfigurasi Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 30, // Maksimal 30 request per menit
  message: {
    error: "Terlalu banyak permintaan, coba lagi nanti",
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: "Terlalu banyak permintaan, coba lagi nanti",
    });
  },
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(compression());
app.use(limiter);
app.use(express.static("public"));

// Konfigurasi Server
const CONFIG = {
  HOST: process.env.MC_HOST || "basic-6.alstore.space",
  PORT: parseInt(process.env.MC_PORT) || 25710,
  TIMEOUT: parseInt(process.env.MC_TIMEOUT) || 5000,
  CACHE_TIME: parseInt(process.env.CACHE_TIME) || 30000, // 30 detik cache
};

// Cache in-memory
let cache = {
  data: null,
  timestamp: 0,
};

// Utility functions
const isCacheValid = () => {
  return Date.now() - cache.timestamp < CONFIG.CACHE_TIME;
};

const getServerStatus = async () => {
  if (isCacheValid() && cache.data) {
    return cache.data;
  }

  try {
    const result = await status(CONFIG.HOST, CONFIG.PORT, {
      timeout: CONFIG.TIMEOUT,
      enableSRV: true,
    });

    const responseData = {
      online: true,
      motd: result.motd?.clean || "",
      players: {
        online: result.players.online,
        max: result.players.max,
        list: result.players.sample?.map(player => player.name) || [],
      },
      version: result.version?.name || "Unknown",
      ping: result.roundTripLatency || 0,
      favicon: result.favicon || null,
      address: `${CONFIG.HOST}:${CONFIG.PORT}`,
      lastUpdated: new Date().toISOString(),
    };

    // Update cache
    cache = {
      data: responseData,
      timestamp: Date.now(),
    };

    return responseData;
  } catch (error) {
    logger.error(`Server status error: ${error.message}`);
    
    const offlineData = {
      online: false,
      address: `${CONFIG.HOST}:${CONFIG.PORT}`,
      lastChecked: new Date().toISOString(),
    };

    // Cache offline status juga
    cache = {
      data: offlineData,
      timestamp: Date.now(),
    };

    return offlineData;
  }
};

// Routes
app.get("/api/status", async (req, res) => {
  try {
    const status = await getServerStatus();
    
    // Log request
    logger.info(`Status request from ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      online: status.online,
    });

    res.json(status);
  } catch (error) {
    logger.error(`API Error: ${error.message}`);
    res.status(500).json({
      error: "Internal server error",
      message: "Gagal mengambil status server",
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// API Documentation
app.get("/api/docs", (req, res) => {
  res.json({
    name: "Minecraft Server Status API",
    version: "2.0.0",
    endpoints: {
      "/api/status": "Mendapatkan status server Minecraft",
      "/api/health": "Health check server API",
      "/api/docs": "Dokumentasi API ini",
    },
    example: {
      status: "/api/status",
      health: "/api/health",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    error: "Terjadi kesalahan internal server",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint tidak ditemukan",
    availableEndpoints: [
      "/api/status",
      "/api/health",
      "/api/docs",
    ],
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server berjalan di port ${PORT}`);
  logger.info(`Minecraft server target: ${CONFIG.HOST}:${CONFIG.PORT}`);
  logger.info(`Cache time: ${CONFIG.CACHE_TIME}ms`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.info("Menerima SIGTERM, menutup server...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("Menerima SIGINT, menutup server...");
  process.exit(0);
});

export default app;
