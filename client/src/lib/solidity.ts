declare global {
  interface Window {
    Module?: any;
  }
}

let compiler: any = null;
let compilerLoading: Promise<any> | null = null;

async function loadCompiler(): Promise<any> {
  if (compiler) return compiler;
  if (compilerLoading) return compilerLoading;

  compilerLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://binaries.soliditylang.org/bin/soljson-v0.8.30+commit.e8df2a48.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      try {
        const soljson = (window as any).Module;
        if (!soljson) {
          reject(new Error('Solidity compiler module not found'));
          return;
        }

        const init = () => {
          try {
            const compile = soljson.cwrap('solidity_compile', 'string', ['string', 'number']);
            const version = soljson.cwrap('solidity_version', 'string', []);
            compiler = {
              compile: (input: string) => compile(input, 0),
              version: () => version(),
            };
            resolve(compiler);
          } catch (err) {
            reject(err);
          }
        };

        if (typeof soljson.onRuntimeInitialized === 'function') {
          soljson.onRuntimeInitialized = init;
        } else {
          init();
        }
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => reject(new Error('Failed to load Solidity compiler'));
    document.head.appendChild(script);
  });

  return compilerLoading;
}

export function generateContractSource(
  name: string,
  symbol: string,
  decimals: number
): string {
  return `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ${symbol} {
    string public name = "${name}";
    string public symbol = "${symbol}";
    uint8 public constant decimals = ${decimals};

    uint256 public constant INITIAL_SUPPLY = 10_000_000 * (10 ** uint256(decimals));
    uint256 public totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) private _blacklist;

    address public owner;
    bool public paused;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Paused(address account);
    event Unpaused(address account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Blacklisted(address indexed account);
    event Unblacklisted(address indexed account);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "${symbol}: caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "${symbol}: paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "${symbol}: not paused");
        _;
    }

    modifier notBlacklisted(address account) {
        require(!_blacklist[account], "${symbol}: account is blacklisted");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalSupply = INITIAL_SUPPLY;
        _balances[owner] = INITIAL_SUPPLY;
        paused = false;
        emit Transfer(address(0), owner, INITIAL_SUPPLY);
        emit OwnershipTransferred(address(0), owner);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address tokenOwner, address spender) external view returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    function isBlacklisted(address account) external view returns (bool) {
        return _blacklist[account];
    }

    function transfer(address to, uint256 amount) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(to) returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external whenNotPaused returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external whenNotPaused notBlacklisted(from) notBlacklisted(to) returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "${symbol}: transfer amount exceeds allowance");
        _approve(from, msg.sender, currentAllowance - amount);
        _transfer(from, to, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external whenNotPaused returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external whenNotPaused returns (bool) {
        uint256 current = _allowances[msg.sender][spender];
        require(current >= subtractedValue, "${symbol}: decreased allowance below zero");
        _approve(msg.sender, spender, current - subtractedValue);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "${symbol}: transfer from the zero address");
        require(to != address(0), "${symbol}: transfer to the zero address");
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "${symbol}: transfer amount exceeds balance");
        _balances[from] = fromBalance - amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _approve(address tokenOwner, address spender, uint256 amount) internal {
        require(tokenOwner != address(0), "${symbol}: approve from the zero address");
        require(spender != address(0), "${symbol}: approve to the zero address");
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }

    function pause() external onlyOwner whenNotPaused {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner whenPaused {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function blacklist(address account) external onlyOwner {
        require(account != owner, "${symbol}: cannot blacklist owner");
        _blacklist[account] = true;
        emit Blacklisted(account);
    }

    function unblacklist(address account) external onlyOwner {
        _blacklist[account] = false;
        emit Unblacklisted(account);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "${symbol}: mint to the zero address");
        totalSupply += amount;
        _balances[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    function burn(uint256 amount) external onlyOwner {
        uint256 accountBalance = _balances[msg.sender];
        require(accountBalance >= amount, "${symbol}: burn amount exceeds balance");
        _balances[msg.sender] = accountBalance - amount;
        totalSupply -= amount;
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "${symbol}: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }
}
`;
}

export interface CompilationResult {
  abi: any[];
  bytecode: string;
  errors?: string[];
}

export async function compileContract(sourceCode: string, contractName: string): Promise<CompilationResult> {
  const res = await fetch('/api/solidity/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceCode, contractName }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Compilation failed');
  }
  return { abi: data.abi, bytecode: data.bytecode, errors: data.errors || [] };
}
