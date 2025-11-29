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
  online: result.online ?? false,

  ip: result.ip ?? "",
  port: result.port ?? "",
  hostname: result.hostname ?? null,

  debug: {
    ping: result.debug?.ping ?? false,
    query: result.debug?.query ?? false,
    bedrock: result.debug?.bedrock ?? false,
    srv: result.debug?.srv ?? false,
    querymismatch: result.debug?.querymismatch ?? false,
    ipinsrv: result.debug?.ipinsrv ?? false,
    cnameinsrv: result.debug?.cnameinsrv ?? false,
    animatedmotd: result.debug?.animatedmotd ?? false,
    cachehit: result.debug?.cachehit ?? false,
    cachetime: result.debug?.cachetime ?? 0,
    cacheexpire: result.debug?.cacheexpire ?? 0,
    apiversion: result.debug?.apiversion ?? 2
  },

  version: result.version ?? "Unknown",

  protocol: result.protocol
    ? {
        version: result.protocol.version ?? null,
        name: result.protocol.name ?? null
      }
    : null,

  icon: result.icon ?? null,

  software: result.software ?? null,

  map: result.map
    ? {
        raw: result.map.raw,
        clean: result.map.clean,
        html: result.map.html
      }
    : null,

  gamemode: result.gamemode ?? null,
  serverid: result.serverid ?? null,
  eula_blocked: result.eula_blocked ?? false,

  motd: result.motd
    ? {
        raw: result.motd.raw ?? [],
        clean: result.motd.clean ?? [],
        html: result.motd.html ?? []
      }
    : { raw: [], clean: [], html: [] },

  players: {
    online: result.players?.online ?? 0,
    max: result.players?.max ?? 0,
    list: result.players?.list ?? []
  },

  plugins: result.plugins ?? [],
  mods: result.mods ?? [],

  info: result.info
    ? {
        raw: result.info.raw ?? [],
        clean: result.info.clean ?? [],
        html: result.info.html ?? []
      }
    : null
    })
  } catch (err) {
    res.json({
      online: false,
      address: `${HOST}:${PORT}`,
    })
  }
})

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
