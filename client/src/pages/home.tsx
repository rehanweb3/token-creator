import { useState } from "react";
import { WalletButton } from "@/components/wallet-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TokenCreator } from "@/components/token-creator";
import { TokenSelector } from "@/components/token-selector";
import { TokenManager } from "@/components/token-manager";
import { Separator } from "@/components/ui/separator";
import type { Token } from "@shared/schema";
import { Coins } from "lucide-react";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  const handleDeploymentSuccess = (token: Token) => {
    setSelectedToken(token);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">BNB Token Creator</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <WalletButton onAccountChange={setWalletAddress} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Deploy Custom Tokens on BNB Chain
            </h2>
            <p className="text-muted-foreground text-lg">
              Create and manage ERC-20 tokens with owner-controlled functions like pause, mint, and burn
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TokenCreator
              walletAddress={walletAddress}
              onDeploymentSuccess={handleDeploymentSuccess}
            />

            <div className="space-y-6">
              <TokenSelector
                walletAddress={walletAddress}
                selectedToken={selectedToken}
                onTokenSelect={setSelectedToken}
              />

              {selectedToken && (
                <>
                  <Separator />
                  <TokenManager token={selectedToken} walletAddress={walletAddress} />
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-16">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>Built with Vite, React, TypeScript, ethers.js, and Solidity</p>
        </div>
      </footer>
    </div>
  );
}
