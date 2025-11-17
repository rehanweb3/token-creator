import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ChevronDown } from "lucide-react";
import { requestAccounts, getCurrentAccount, switchToBSC, getChainId, BSC_MAINNET } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WalletButtonProps {
  onAccountChange?: (account: string | null) => void;
}

export function WalletButton({ onAccountChange }: WalletButtonProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const { toast } = useToast();

  const updateAccount = async () => {
    const currentAccount = await getCurrentAccount();
    setAccount(currentAccount);
    onAccountChange?.(currentAccount);
  };

  const updateChainId = async () => {
    try {
      const id = await getChainId();
      setChainId(id);
      setIsCorrectNetwork(id === BSC_MAINNET.chainId);
    } catch (error) {
      setChainId(null);
      setIsCorrectNetwork(false);
    }
  };

  useEffect(() => {
    updateAccount();
    updateChainId();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        const newAccount = accounts[0] || null;
        setAccount(newAccount);
        onAccountChange?.(newAccount);
      });

      window.ethereum.on("chainChanged", () => {
        updateChainId();
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", updateAccount);
        window.ethereum.removeListener("chainChanged", updateChainId);
      }
    };
  }, []);

  const handleConnect = async () => {
    try {
      const account = await requestAccounts();
      await switchToBSC();
      setAccount(account);
      onAccountChange?.(account);
      await updateChainId();
      toast({
        title: "Wallet Connected",
        description: `Connected to ${account.slice(0, 6)}...${account.slice(-4)}`,
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchToBSC();
      await updateChainId();
      toast({
        title: "Network Switched",
        description: "Successfully switched to BNB Chain",
      });
    } catch (error: any) {
      toast({
        title: "Network Switch Failed",
        description: error.message || "Failed to switch network",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    setAccount(null);
    onAccountChange?.(null);
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!account) {
    return (
      <Button onClick={handleConnect} data-testid="button-connect-wallet">
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isCorrectNetwork && (
        <Badge variant="destructive" className="cursor-pointer" onClick={handleSwitchNetwork} data-testid="badge-wrong-network">
          Wrong Network
        </Badge>
      )}
      {isCorrectNetwork && (
        <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-accent" data-testid="badge-network">
          BNB Chain
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="font-mono" data-testid="button-wallet-menu">
            <Wallet className="mr-2 h-4 w-4" />
            {truncateAddress(account)}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDisconnect} data-testid="menu-item-disconnect">
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
