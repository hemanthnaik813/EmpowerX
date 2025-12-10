// ==============================================
// server.js — Assistive Backend (FINAL CLEAN VERSION)
// Supports:
//   ✔ Voice Search → Flask API (5001)
//   ✔ Gesture Recognition → Flask API (5001)
//   ✔ FTSO Crypto Prices (BTC/ETH/FLR)
//   ✔ Used by React HUD Frontend (3000)
// ==============================================

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import { interfaceToAbi } from "@flarenetwork/flare-periphery-contract-artifacts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" })); // accept webcam frames

// ----------------------------------------------------------
// Flask API Endpoints
// ----------------------------------------------------------
const FLASK_SEARCH = "http://127.0.0.1:5001/api/search";
const FLASK_GESTURE = "http://127.0.0.1:5001/api/gesture";

// ----------------------------------------------------------
// FTSO CONFIG
// ----------------------------------------------------------
const RPC_URL = "https://flare-api.flare.network/ext/C/rpc";
const FTSO_ADDRESS = "0x3d893C53D9e8056135C26C8c638B76C8b60Df726"; // coston2 address

// Feed IDs
const FEEDS = {
  "BTC/USD": "0x014254522f55534400000000000000000000000000",
  "ETH/USD": "0x014554482f55534400000000000000000000000000",
  "FLR/USD": "0x01464c522f55534400000000000000000000000000"
};

const provider = new ethers.JsonRpcProvider(RPC_URL);
const abi = interfaceToAbi("FtsoV2Interface", "coston2");
const ftso = new ethers.Contract(FTSO_ADDRESS, abi, provider);

// ----------------------------------------------------------
// Read FTSO feed
// ----------------------------------------------------------
async function readFtso(feedIdHex) {
  const result = await ftso.getFeedsById([feedIdHex]);
  const raw = Number(result[0][0]);
  const decimals = Number(result[1][0]);
  const timestamp = Number(result[2]);

  return {
    value: raw / 10 ** decimals,
    decimals,
    timestamp
  };
}

// Fallback: Coingecko
async function fallbackPrice(symbol) {
  const map = { btc: "bitcoin", eth: "ethereum", flr: "flare-token" };
  const id = map[symbol];

  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
    );
    const j = await r.json();
    return j[id].usd;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------
// API → /ftso
// ----------------------------------------------------------
app.post("/ftso", async (req, res) => {
  try {
    const sym = (req.body.symbol || "").toLowerCase();
    const feedKey =
      sym === "btc" ? "BTC/USD" :
      sym === "eth" ? "ETH/USD" :
      sym === "flr" ? "FLR/USD" : null;

    if (!feedKey) return res.status(400).json({ error: "unsupported symbol" });

    try {
      const feed = await readFtso(FEEDS[feedKey]);
      return res.json({
        symbol: feedKey,
        price: feed.value,
        source: "ftso",
        timestamp: feed.timestamp
      });
    } catch (err) {
      const fallback = await fallbackPrice(sym);
      return res.json({
        symbol: feedKey,
        price: fallback,
        source: "coingecko_fallback"
      });
    }
  } catch (err) {
    res.status(500).json({ error: "ftso_error", details: err.message });
  }
});

// ----------------------------------------------------------
// API → /gesture
// ----------------------------------------------------------
app.post("/gesture", async (req, res) => {
  try {
    const { frame } = req.body;
    if (!frame) return res.status(400).json({ error: "missing frame" });

    const response = await fetch(FLASK_GESTURE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frame })
    });

    return res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: "gesture_error", message: err.message });
  }
});

// ----------------------------------------------------------
// API → /search  (auto-detect crypto query → FTSO)
// ----------------------------------------------------------
app.post("/search", async (req, res) => {
  try {
    const q = (req.body.query || "").toLowerCase();

    const isPrice = q.includes("price") || q.includes("rate");
    const wantsBTC = q.includes("btc") || q.includes("bitcoin");
    const wantsETH = q.includes("eth") || q.includes("ethereum");
    const wantsFLR = q.includes("flr") || q.includes("flare");

    if (isPrice && (wantsBTC || wantsETH || wantsFLR)) {
      const s = wantsBTC ? "btc" : wantsETH ? "eth" : "flr";
      try {
        const feedKey =
          s === "btc" ? "BTC/USD" :
          s === "eth" ? "ETH/USD" :
          "FLR/USD";

        const feed = await readFtso(FEEDS[feedKey]);
        return res.json({
          summary: `${s.toUpperCase()} price: ${feed.value} USD`,
          source: "ftso"
        });
      } catch {
        const fallback = await fallbackPrice(s);
        return res.json({
          summary: `${s.toUpperCase()} price: ${fallback} USD (fallback)`,
          source: "coingecko"
        });
      }
    }

    // Normal search → Flask
    const r = await fetch(FLASK_SEARCH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: req.body.query })
    });

    return res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: "search_error", message: err.message });
  }
});

// ----------------------------------------------------------
// Start Server
// ----------------------------------------------------------
const PORT = 3001;
app.listen(PORT, () => {
  console.log("\n=====================================");
  console.log(`🚀 Backend running at: http://localhost:${PORT}`);
  console.log("=====================================\n");
});
