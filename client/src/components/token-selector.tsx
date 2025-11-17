import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Token } from "@shared/schema";

interface TokenSelectorProps {
  walletAddress: string | null;
  selectedToken: Token | null;
  onTokenSelect: (token: Token | null) => void;
}

export function TokenSelector({ walletAddress, selectedToken, onTokenSelect }: TokenSelectorProps) {
  const { data: tokens, isLoading } = useQuery<Token[]>({
    queryKey: ["/api/tokens", walletAddress],
    enabled: !!walletAddress,
  });

  if (!walletAddress) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Your Deployed Tokens</Label>
        <div className="h-11 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Your Deployed Tokens</Label>
        <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
          No tokens deployed yet. Create your first token above!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="token-selector">Your Deployed Tokens</Label>
      <Select
        value={selectedToken?.id || ""}
        onValueChange={(value) => {
          const token = tokens.find((t) => t.id === value);
          onTokenSelect(token || null);
        }}
      >
        <SelectTrigger id="token-selector" data-testid="select-token">
          <SelectValue placeholder="Select a token to manage" />
        </SelectTrigger>
        <SelectContent>
          {tokens.map((token) => (
            <SelectItem key={token.id} value={token.id} data-testid={`select-item-${token.id}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold">{token.tokenSymbol}</span>
                  <span className="text-muted-foreground ml-2">{token.tokenName}</span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {token.contractAddress.slice(0, 6)}...{token.contractAddress.slice(-4)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
