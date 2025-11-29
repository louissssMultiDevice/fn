import express from "express";
import cors from "cors";
import { status } from "minecraft-server-util";

const app = express();
app.use(cors());
app.use(express.static("public"));

const HOST = "basic-6.alstore.space";
const PORT = 25710;

app.get("/api/status", async (req, res) => {
  try {
    const result = await status(HOST, PORT, {
      timeout: 3000,
    });

    res.json({
      online: true,
      motd: result.motd?.clean ?? "",
      players: {
        online: result.players.online,
        max: result.players.max,
      },
      version: result.version?.name ?? "Unknown",
      ping: result.roundTripLatency ?? 0,
      favicon: result.favicon ?? null,
      address: `${HOST}:${PORT}`,
    });
  } catch (err) {
    res.json({
      online: false,
      address: `${HOST}:${PORT}`,
    });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
