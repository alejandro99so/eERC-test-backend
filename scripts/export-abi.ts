import { artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const contracts = [
  "EncryptedERC",
  "Registrar",
  "tokens/SimpleERC20",
  // Agrega aquí más contratos si necesitas sus ABIs
];

const main = async () => {
  const abiOutput: Record<string, any> = {};

  for (const contractName of contracts) {
    try {
      // Buscar el artefacto
      const artifact = await artifacts.readArtifact(contractName);
      abiOutput[contractName] = {
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        deployedBytecode: artifact.deployedBytecode,
        contractName: artifact.contractName,
      };
    } catch (err) {
      console.error(`No se pudo encontrar el artefacto para: ${contractName}`);
    }
  }

  // Guardar el ABI completo
  const outputPath = path.join(__dirname, "../abi-full.json");
  fs.writeFileSync(outputPath, JSON.stringify(abiOutput, null, 2));
  console.log(`✅ ABI completo exportado a: ${outputPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
}); 