import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// In-memory tournament data
let tournamentData = {
  r1: Array(16).fill(null).map(() => ({ name: "TBD", score: "" })),
  qf: Array(8).fill(null).map(() => ({ name: "TBD", score: "" })),
  sf: Array(4).fill(null).map(() => ({ name: "TBD", score: "" })),
  f: Array(2).fill(null).map(() => ({ name: "TBD", score: "" })),
  champ: "TBD"
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Tournament API endpoints
  app.get("/api/tournament", (_req, res) => {
    console.log("[API] GET /api/tournament");
    res.json(tournamentData);
  });

  app.post("/api/tournament", (req, res) => {
    console.log("[API] POST /api/tournament");
    const { r1, qf, sf, f, champ } = req.body;
    
    if (r1) tournamentData.r1 = r1;
    if (qf) tournamentData.qf = qf;
    if (sf) tournamentData.sf = sf;
    if (f) tournamentData.f = f;
    if (champ !== undefined) tournamentData.champ = champ;

    res.json({ success: true, data: tournamentData });
  });

  const httpServer = createServer(app);

  return httpServer;
}
