import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTokenSchema } from "@shared/schema";
import solc from "solc";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/tokens", async (req, res) => {
    try {
      const validatedData = insertTokenSchema.parse(req.body);
      const token = await storage.createToken(validatedData);
      res.json(token);
    } catch (error: any) {
      console.error("Error creating token:", error);
      res.status(400).json({ 
        error: "Failed to create token",
        message: error.message 
      });
    }
  });

  app.get("/api/tokens/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const tokens = await storage.getTokensByWallet(walletAddress);
      res.json(tokens);
    } catch (error: any) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ 
        error: "Failed to fetch tokens",
        message: error.message 
      });
    }
  });

  app.post("/api/solidity/compile", async (req, res) => {
    try {
      const { sourceCode, contractName } = req.body || {};
      if (typeof sourceCode !== "string" || typeof contractName !== "string") {
        res.status(400).json({ error: "Invalid input" });
        return;
      }

      const input = {
        language: "Solidity",
        sources: {
          "Token.sol": { content: sourceCode },
        },
        settings: {
          optimizer: { enabled: true, runs: 200 },
          outputSelection: {
            "*": { "*": ["abi", "evm.bytecode.object"] },
          },
        },
      };

      const output = JSON.parse(solc.compile(JSON.stringify(input)));
      if (output.errors) {
        const errors = output.errors.filter((e: any) => e.severity === "error");
        if (errors.length) {
          res.status(400).json({ error: errors.map((e: any) => e.formattedMessage).join("\n") });
          return;
        }
      }

      const contract = output.contracts?.["Token.sol"]?.[contractName];
      if (!contract) {
        const available = Object.keys(output.contracts?.["Token.sol"] || {}).join(", ") || "none";
        res.status(404).json({ error: `Contract ${contractName} not found. Available: ${available}` });
        return;
      }

      res.json({
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object,
        errors: output.errors?.filter((e: any) => e.severity !== "error").map((e: any) => e.formattedMessage) || [],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Compilation failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
