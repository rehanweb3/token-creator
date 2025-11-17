import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateContractSource, compileContract } from "@/lib/solidity";
import { getProvider } from "@/lib/web3";
import { ContractFactory } from "ethers";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Token } from "@shared/schema";

interface TokenCreatorProps {
  walletAddress: string | null;
  onDeploymentSuccess: (token: Token) => void;
}

export function TokenCreator({ walletAddress, onDeploymentSuccess }: TokenCreatorProps) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<string>("");
  const { toast } = useToast();

  const handleDeploy = async () => {
    if (!walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!name || !symbol || !decimals) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const decimalsNum = parseInt(decimals);
    if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) {
      toast({
        title: "Invalid Decimals",
        description: "Decimals must be between 0 and 18",
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);
    setDeploymentStatus("Generating contract code...");

    try {
      const sourceCode = generateContractSource(name, symbol, decimalsNum);
      
      setDeploymentStatus("Compiling contract...");
      const compiled = compileContract(sourceCode, symbol);

      setDeploymentStatus("Waiting for wallet signature...");
      const provider = await getProvider();
      const signer = await provider.getSigner();

      setDeploymentStatus("Deploying contract...");
      const factory = new ContractFactory(compiled.abi, compiled.bytecode, signer);
      const contract = await factory.deploy();

      setDeploymentStatus("Waiting for confirmation...");
      await contract.waitForDeployment();

      const contractAddress = await contract.getAddress();
      const network = await provider.getNetwork();

      setDeploymentStatus("Saving to database...");
      const response = await apiRequest("POST", "/api/tokens", {
        walletAddress,
        tokenName: name,
        tokenSymbol: symbol,
        contractAddress,
        chainId: Number(network.chainId),
        decimals: decimalsNum,
      });

      const savedToken = await response.json();
      
      await queryClient.invalidateQueries({ queryKey: ["/api/tokens", walletAddress] });

      toast({
        title: "Deployment Successful!",
        description: `${symbol} deployed at ${contractAddress.slice(0, 10)}...`,
      });

      onDeploymentSuccess(savedToken);
      
      setName("");
      setSymbol("");
      setDecimals("18");
      setDeploymentStatus("");
    } catch (error: any) {
      console.error("Deployment error:", error);
      toast({
        title: "Deployment Failed",
        description: error.message || "An error occurred during deployment",
        variant: "destructive",
      });
      setDeploymentStatus("");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Card data-testid="card-token-creator">
      <CardHeader>
        <CardTitle>Create New Token</CardTitle>
        <CardDescription>
          Deploy a custom ERC-20 token on BNB Chain with owner-controlled functions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token-name">Token Name</Label>
            <Input
              id="token-name"
              placeholder="e.g., My Token"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isDeploying}
              data-testid="input-token-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token-symbol">Token Symbol</Label>
            <Input
              id="token-symbol"
              placeholder="e.g., MTK"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              disabled={isDeploying}
              data-testid="input-token-symbol"
            />
            <p className="text-sm text-muted-foreground">
              This will also be used as the contract name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decimals">Decimals</Label>
            <Input
              id="decimals"
              type="number"
              min="0"
              max="18"
              placeholder="18"
              value={decimals}
              onChange={(e) => setDecimals(e.target.value)}
              disabled={isDeploying}
              data-testid="input-decimals"
            />
            <p className="text-sm text-muted-foreground">
              Standard is 18. Initial supply: 10,000,000 tokens
            </p>
          </div>
        </div>

        {deploymentStatus && (
          <div className="rounded-lg bg-muted p-4" data-testid="text-deployment-status">
            <p className="text-sm font-medium flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {deploymentStatus}
            </p>
          </div>
        )}

        <Button
          onClick={handleDeploy}
          disabled={isDeploying || !walletAddress}
          className="w-full"
          size="lg"
          data-testid="button-deploy-token"
        >
          {isDeploying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Deploy Token
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
