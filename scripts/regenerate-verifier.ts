import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { Base8, mulPointEscalar, subOrder } from "@zk-kit/baby-jubjub";
import { formatPrivKeyForBabyJub, genPrivKey } from "maci-crypto";
import { poseidon3 } from "poseidon-lite";

const main = async () => {
    console.log("🔄 Regenerando verifier con gnark v0.11.0...");
    
    // Generar inputs válidos para crear el circuito
    const privateKey = genPrivKey();
    const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder;
    const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) => BigInt(x));
    const chainId = 43113n;
    const address = BigInt("0x38332d73dC01548fC6710Acbbe8116516111781A");
    const registrationHash = poseidon3([
        chainId,
        formattedPrivateKey,
        address,
    ]);
    
    const inputs = {
        privateInputs: [formattedPrivateKey.toString()],
        publicInputs: [
            publicKey[0].toString(),
            publicKey[1].toString(),
            address.toString(),
            chainId.toString(),
            registrationHash.toString()
        ]
    };
    
    const inputsPath = path.join(__dirname, "../temp-verifier-inputs.json");
    const outputPath = path.join(__dirname, "../temp-verifier-proof.json");
    
    fs.writeFileSync(inputsPath, JSON.stringify(inputs, null, 2));
    
    // Generar proof y extraer archivos del circuito
    const command = `cd zk && ./cmd/main -operation=REGISTER -input="${inputsPath}" -output="${outputPath}" -new=true -extract=true`;
    
    console.log("Ejecutando:", command);
    execSync(command, { stdio: 'inherit' });
    
    console.log("✅ Verifier regenerado exitosamente");
    
    // Limpiar archivos temporales
    fs.unlinkSync(inputsPath);
    fs.unlinkSync(outputPath);
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 