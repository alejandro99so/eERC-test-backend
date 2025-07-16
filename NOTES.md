# EncryptedERC Project Notes

## Overview
EncryptedERC is a privacy-preserving ERC-20 token system that uses zero-knowledge proofs and BabyJubJub cryptography to enable private token operations while maintaining regulatory compliance.

## Key Concepts

### EGCT (Encrypted Gas Credit Token)
- The main token of the EncryptedERC system
- Provides privacy-preserving functionality for token transfers
- Uses zero-knowledge proofs to hide transaction details while maintaining auditability

### PCT (Privacy Credit Token)
- A secondary token in the system
- Also supports privacy-preserving operations
- Works alongside EGCT in the encrypted token ecosystem

### BabyJubJub Cryptography
- Elliptic curve cryptography used for key generation and encryption
- Provides efficient operations for zero-knowledge proof systems
- Used for generating user public/private key pairs

### Zero-Knowledge Proofs (ZKP)
- Mathematical proofs that prove knowledge of information without revealing the information itself
- Used to verify token operations without exposing transaction details
- Enables privacy while maintaining regulatory compliance

## System Architecture

### Core Components
1. **EncryptedERC.sol** - Main smart contract managing the privacy-preserving token system
2. **Registrar.sol** - Handles user registration with public keys
3. **AuditorManager.sol** - Manages auditor permissions and oversight
4. **Verifier Contracts** - Verify zero-knowledge proofs for different operations

### Key Operations
- **Registration**: Users register with public keys using ZK proofs
- **Mint**: Create new tokens with privacy
- **Transfer**: Send tokens privately between users
- **Burn**: Destroy tokens with privacy
- **Withdraw**: Convert encrypted tokens to regular ERC-20 tokens

## Installation and Setup Considerations

### Go Installation Requirements
- **Version**: Go 1.21 or later required
- **Installation**: Use official installer from golang.org
- **PATH**: Ensure Go is in system PATH
- **GOPATH**: May need to set GOPATH environment variable
- **Verification**: Run `go version` to confirm installation

### Node.js Dependencies
- **Hardhat**: For smart contract development and deployment
- **Ethers.js**: For blockchain interaction
- **TypeScript**: For type-safe development

### Cryptographic Libraries
- **@zk-kit/baby-jubjub**: For BabyJubJub curve operations
- **maci-crypto**: For cryptographic utilities
- **poseidon-lite**: For Poseidon hash function

## Version Compatibility Issues

### Gnark Version Mismatch
**Problem**: ZK tools and contract verifiers must use the same gnark version
- ZK tools compiled with one gnark version
- Contract verifiers deployed with different gnark version
- Results in proof verification failures

**Solution**: 
1. Identify gnark version used in deployed contracts
2. Recompile ZK tools with matching gnark version
3. Regenerate circuit files with compatible version
4. Ensure all components use same cryptographic parameters

### Circuit File Compatibility
**Problem**: Circuit artifacts must match deployed verifier contracts
- Circuit files generated with different parameters
- Proof generation fails or produces incompatible proofs
- Contract calls revert with "execution reverted"

**Solution**:
1. Use same circuit compilation parameters
2. Regenerate circuit files with correct version
3. Verify circuit artifacts match deployed contracts

## Common Problems and Solutions

### 1. Go Binary File Reading Issues
**Problem**: Go binary expects file content, not file path
```
Error: invalid character 'f' looking for beginning of value
```

**Solution**: Modify Go code to read file content instead of passing file path as string
```go
// Instead of: input := os.Args[1]
// Use:
content, err := os.ReadFile(os.Args[1])
if err != nil {
    log.Fatal(err)
}
input := string(content)
```

### 2. Missing Circuit Files
**Problem**: ZK tools can't find required circuit files
```
Error: open /path/to/circuit.r1cs: no such file or directory
```

**Solution**: 
1. Ensure circuit files are generated before running ZK tools
2. Check file paths in scripts
3. Generate missing circuit artifacts

### 3. JSON Parsing Errors
**Problem**: Invalid JSON format in input files
```
Error: invalid character 'x' looking for beginning of value
```

**Solution**:
1. Validate JSON format before passing to tools
2. Use proper JSON serialization
3. Check for extra characters or formatting issues

### 4. Contract Deployment Issues
**Problem**: Verifier contracts fail to deploy or verify
```
Error: execution reverted
```

**Solution**:
1. Verify contract bytecode matches source
2. Check constructor parameters
3. Ensure all dependencies are deployed
4. Verify network configuration

### 5. Proof Generation Failures
**Problem**: ZK proofs fail to generate or verify
```
Error: proof verification failed
```

**Solution**:
1. Check input parameters match circuit constraints
2. Verify cryptographic keys are valid
3. Ensure circuit files are compatible
4. Check gnark version compatibility

## Best Practices

### Development Workflow
1. **Start with Go installation** - Ensure proper Go setup before any ZK operations
2. **Compile ZK tools** - Build tools with correct gnark version
3. **Generate circuit files** - Create circuit artifacts with compatible parameters
4. **Deploy contracts** - Deploy with matching verifier contracts
5. **Test proof generation** - Verify proofs work with deployed contracts
6. **Integrate with frontend** - Connect all components together

### Debugging Tips
1. **Preserve temporary files** - Keep generated files for debugging
2. **Add verbose logging** - Include detailed logs in scripts
3. **Check file paths** - Verify all file paths are correct
4. **Validate inputs** - Ensure all inputs are properly formatted
5. **Test incrementally** - Test each component separately

### Security Considerations
1. **Key management** - Securely store private keys
2. **Proof validation** - Always verify proofs before accepting
3. **Auditor oversight** - Maintain proper auditor controls
4. **Access control** - Implement proper permission systems

## File Structure
```
EncryptedERC/
├── contracts/          # Smart contracts
├── circom/            # Circuit definitions
├── zk/                # Go-based ZK tools
├── scripts/           # Deployment and interaction scripts
├── test/              # Test files
└── generated-types/   # TypeScript types
```

## Key Scripts
- `scripts/deploy-standalone.ts` - Deploy complete system
- `scripts/set-auditor.ts` - Configure auditor
- `scripts/register-user-correct.ts` - Register users with ZK proofs

## Troubleshooting Checklist
- [ ] Go properly installed and in PATH
- [ ] ZK tools compiled with correct gnark version
- [ ] Circuit files generated and accessible
- [ ] Contracts deployed with matching verifiers
- [ ] Cryptographic keys generated correctly
- [ ] Proofs generated with compatible parameters
- [ ] All file paths correct and accessible
- [ ] JSON inputs properly formatted
- [ ] Network configuration correct
- [ ] Gas limits sufficient for operations

## Step-by-Step Commands

### 1. Initial Setup
```bash
# Install Go (macOS)
brew install go

# Verify Go installation
go version

# Install Node.js dependencies
npm install

# Compile TypeScript types
npx hardhat compile
```

### 2. Compile ZK Tools
```bash
# Navigate to zk directory
cd zk

# Initialize Go module (if not already done)
go mod init zk

# Get dependencies
go mod tidy

# Build ZK tools
make build

# Verify tools are built
ls -la cmd/
```

### 3. Generate Circuit Files
```bash
# Navigate back to project root
cd ..

# Generate circuit files using circom
npx circom circom/registration.circom --r1cs --wasm --sym --c

# Copy generated files to zk directory
cp circom/registration.r1cs zk/
cp circom/registration_js/registration.wasm zk/
```

### 4. Deploy Contracts
```bash
# Deploy the complete system
npx hardhat run scripts/deploy-standalone.ts --network localhost

# Note the deployed contract addresses from output
# Example: EncryptedERC deployed to: 0x...
```

### 5. Set Auditor
```bash
# Update auditor address in set-auditor.ts
# Then run:
npx hardhat run scripts/set-auditor.ts --network localhost
```

### 6. Generate Cryptographic Keys
```bash
# Run the registration script (this generates keys and proofs)
npx hardhat run scripts/register-user-correct.ts --network localhost
```

### 7. Verify Installation
```bash
# Check if all components are working
npx hardhat console --network localhost

# In console, verify contract deployment:
# const EncryptedERC = await ethers.getContractFactory("EncryptedERC")
# const contract = await EncryptedERC.attach("DEPLOYED_ADDRESS")
# await contract.auditor()
```

## Troubleshooting Commands

### If Go is not found:
```bash
# Add Go to PATH (macOS)
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.zshrc
source ~/.zshrc

# Or install via official installer
# Download from https://golang.org/dl/
```

### If ZK tools fail to build:
```bash
# Check Go version
go version

# Clean and rebuild
cd zk
go clean
go mod tidy
make build
```

### If circuit files are missing:
```bash
# Install circom if not available
npm install -g circom

# Generate all circuit files
npx circom circom/registration.circom --r1cs --wasm --sym --c
npx circom circom/mint.circom --r1cs --wasm --sym --c
npx circom circom/transfer.circom --r1cs --wasm --sym --c
npx circom circom/burn.circom --r1cs --wasm --sym --c
npx circom circom/withdraw.circom --r1cs --wasm --sym --c
```

### If proof generation fails:
```bash
# Check gnark version compatibility
cd zk
go list -m github.com/consensys/gnark

# Regenerate circuit files with matching version
# Update go.mod if needed
go mod edit -require github.com/consensys/gnark@v0.8.0
go mod tidy
make build
```

### If contract calls revert:
```bash
# Check contract deployment
npx hardhat console --network localhost
# Verify contract addresses and state

# Check proof compatibility
# Ensure circuit files match deployed verifier contracts
```

## Resources
- [Go Installation Guide](https://golang.org/doc/install)
- [Gnark Documentation](https://docs.gnark.consensys.net/)
- [BabyJubJub Specification](https://eips.ethereum.org/EIPS/eip-2494)
- [Hardhat Documentation](https://hardhat.org/docs) 