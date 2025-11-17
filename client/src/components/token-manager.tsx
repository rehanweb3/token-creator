import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getProvider } from "@/lib/web3";
import { Contract } from "ethers";
import { parseEther, formatEther } from "ethers";
import { Loader2, Pause, Play, Shield, Coins, Flame, Users, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import type { Token } from "@shared/schema";

interface TokenManagerProps {
  token: Token;
  walletAddress: string | null;
}

interface FunctionParam {
  name: string;
  type: string;
}

interface ContractFunction {
  name: string;
  inputs: FunctionParam[];
  stateMutability: string;
}

export function TokenManager({ token, walletAddress }: TokenManagerProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [ownerFunctions, setOwnerFunctions] = useState<ContractFunction[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalSupply, setTotalSupply] = useState<string>("0");
  const [functionInputs, setFunctionInputs] = useState<Record<string, Record<string, string>>>({});
  const [executingFunctions, setExecutingFunctions] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadContract();
  }, [token, walletAddress]);

  const loadContract = async () => {
    if (!walletAddress) return;

    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();

      const abi = [
        "function owner() view returns (address)",
        "function paused() view returns (bool)",
        "function totalSupply() view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function pause()",
        "function unpause()",
        "function blacklist(address account)",
        "function unblacklist(address account)",
        "function mint(address to, uint256 amount)",
        "function burn(uint256 amount)",
        "function transferOwnership(address newOwner)",
        "function renounceOwnership()",
        "function isBlacklisted(address account) view returns (bool)",
      ];

      const contractInstance = new Contract(token.contractAddress, abi, signer);
      setContract(contractInstance);

      const ownerAddress = await contractInstance.owner();
      setIsOwner(ownerAddress.toLowerCase() === walletAddress.toLowerCase());

      const pausedState = await contractInstance.paused();
      setIsPaused(pausedState);

      const supply = await contractInstance.totalSupply();
      const decimalsValue = await contractInstance.decimals();
      const decimalsNum = Number(decimalsValue);
      const adjustedSupply = decimalsNum < 18 
        ? supply * (10n ** BigInt(18 - decimalsNum))
        : supply / (10n ** BigInt(decimalsNum - 18));
      setTotalSupply(formatEther(adjustedSupply));

      const functions: ContractFunction[] = [
        { name: "pause", inputs: [], stateMutability: "nonpayable" },
        { name: "unpause", inputs: [], stateMutability: "nonpayable" },
        { name: "blacklist", inputs: [{ name: "account", type: "address" }], stateMutability: "nonpayable" },
        { name: "unblacklist", inputs: [{ name: "account", type: "address" }], stateMutability: "nonpayable" },
        { name: "mint", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], stateMutability: "nonpayable" },
        { name: "burn", inputs: [{ name: "amount", type: "uint256" }], stateMutability: "nonpayable" },
        { name: "transferOwnership", inputs: [{ name: "newOwner", type: "address" }], stateMutability: "nonpayable" },
        { name: "renounceOwnership", inputs: [], stateMutability: "nonpayable" },
      ];

      setOwnerFunctions(functions);
    } catch (error: any) {
      console.error("Error loading contract:", error);
      toast({
        title: "Contract Load Error",
        description: error.message || "Failed to load contract",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const openInExplorer = (address: string) => {
    window.open(`https://bscscan.com/address/${address}`, "_blank");
  };

  const handleExecuteFunction = async (functionName: string) => {
    if (!contract || !isOwner) return;

    setExecutingFunctions((prev) => new Set(prev).add(functionName));

    try {
      const func = ownerFunctions.find((f) => f.name === functionName);
      if (!func) throw new Error("Function not found");

      const args: any[] = [];
      for (const input of func.inputs) {
        const value = functionInputs[functionName]?.[input.name] || "";
        if (!value) {
          throw new Error(`Missing value for parameter: ${input.name}`);
        }

        if (input.type === "uint256") {
          const decimalsValue = await contract.decimals();
          const decimalsNum = Number(decimalsValue);
          const adjustedAmount = decimalsNum < 18
            ? parseEther(value) / (10n ** BigInt(18 - decimalsNum))
            : parseEther(value) * (10n ** BigInt(decimalsNum - 18));
          args.push(adjustedAmount);
        } else if (input.type === "address") {
          args.push(value);
        } else {
          args.push(value);
        }
      }

      const tx = await contract[functionName](...args);
      
      toast({
        title: "Transaction Sent",
        description: "Waiting for confirmation...",
      });

      await tx.wait();

      toast({
        title: "Success!",
        description: `${functionName} executed successfully`,
      });

      await loadContract();
      
      setFunctionInputs((prev) => ({
        ...prev,
        [functionName]: {},
      }));
    } catch (error: any) {
      console.error("Function execution error:", error);
      toast({
        title: "Execution Failed",
        description: error.message || "Failed to execute function",
        variant: "destructive",
      });
    } finally {
      setExecutingFunctions((prev) => {
        const next = new Set(prev);
        next.delete(functionName);
        return next;
      });
    }
  };

  const getFunctionIcon = (name: string) => {
    if (name === "pause") return Pause;
    if (name === "unpause") return Play;
    if (name.includes("blacklist")) return Shield;
    if (name === "mint") return Coins;
    if (name === "burn") return Flame;
    if (name === "transferOwnership" || name === "renounceOwnership") return Users;
    return Coins;
  };

  const getFunctionVariant = (name: string): "default" | "secondary" | "destructive" => {
    if (name === "pause" || name === "blacklist") return "secondary";
    if (name === "burn" || name === "renounceOwnership") return "destructive";
    return "default";
  };

  return (
    <div className="space-y-6">
      <Card data-testid="card-token-info">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{token.tokenName}</CardTitle>
              <CardDescription className="text-lg font-mono">{token.tokenSymbol}</CardDescription>
            </div>
            {isOwner && (
              <Badge variant="default" data-testid="badge-owner">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Owner
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Contract Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate" data-testid="text-contract-address">
                  {token.contractAddress}
                </code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(token.contractAddress)} data-testid="button-copy-address">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => openInExplorer(token.contractAddress)} data-testid="button-view-explorer">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Total Supply</Label>
              <p className="text-lg font-semibold mt-1" data-testid="text-total-supply">
                {parseFloat(totalSupply).toLocaleString()} {token.tokenSymbol}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Decimals</Label>
              <p className="text-lg font-semibold mt-1" data-testid="text-decimals">{token.decimals}</p>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Status</Label>
              <div className="mt-1">
                <Badge variant={isPaused ? "destructive" : "default"} data-testid="badge-status">
                  {isPaused ? "Paused" : "Active"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Owner Functions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ownerFunctions.map((func) => {
              const Icon = getFunctionIcon(func.name);
              const isExecuting = executingFunctions.has(func.name);
              const shouldDisable =
                (func.name === "pause" && isPaused) ||
                (func.name === "unpause" && !isPaused);

              return (
                <Card key={func.name} data-testid={`card-function-${func.name}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {func.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {func.inputs.map((input) => (
                      <div key={input.name} className="space-y-1">
                        <Label className="text-xs">{input.name}</Label>
                        <Input
                          placeholder={input.type === "address" ? "0x..." : input.type === "uint256" ? "Amount" : ""}
                          value={functionInputs[func.name]?.[input.name] || ""}
                          onChange={(e) =>
                            setFunctionInputs((prev) => ({
                              ...prev,
                              [func.name]: {
                                ...prev[func.name],
                                [input.name]: e.target.value,
                              },
                            }))
                          }
                          disabled={isExecuting}
                          data-testid={`input-${func.name}-${input.name}`}
                        />
                      </div>
                    ))}

                    <Button
                      onClick={() => handleExecuteFunction(func.name)}
                      disabled={isExecuting || shouldDisable || !isOwner}
                      variant={getFunctionVariant(func.name)}
                      className="w-full"
                      data-testid={`button-execute-${func.name}`}
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        `Execute ${func.name}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!isOwner && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You are not the owner of this contract. Owner functions are not available.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
