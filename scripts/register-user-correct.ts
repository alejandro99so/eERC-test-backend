import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { Base8, mulPointEscalar, subOrder } from "@zk-kit/baby-jubjub";
import { formatPrivKeyForBabyJub, genPrivKey } from "maci-crypto";
import { poseidon3 } from "poseidon-lite";

const main = async () => {
    try {
        // 1. Setup
        const [deployer] = await ethers.getSigners();
        const userAddress = deployer.address;
        const deploymentPath = path.join(__dirname, "../deployments/latest-fuji.json");
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
        const registrarAddress = deploymentData.contracts.registrar;
        const registrar = await ethers.getContractAt("Registrar", registrarAddress, deployer);

        // 2. Generar claves y hash
        const privateKey = genPrivKey();
        console.log("privateKey", privateKey);
        const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder;
        console.log("formattedPrivateKey", formattedPrivateKey);
        const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) => BigInt(x));
        const chainId = await ethers.provider.getNetwork().then(net => net.chainId);
        const address = BigInt(userAddress);
        const registrationHash = poseidon3([
            BigInt(chainId),
            formattedPrivateKey,
            address,
        ]);
        console.log("inputs Poseidon: ", [
            BigInt(chainId),
            formattedPrivateKey,
            address,
        ])
        // 3. Crear input para snarkjs
        const snarkjsInputs = {
            "SenderPrivateKey": formattedPrivateKey.toString(),
            "SenderPublicKey": [publicKey[0].toString(), publicKey[1].toString()],
            "SenderAddress": address.toString(),
            "ChainID": chainId.toString(),
            "RegistrationHash": registrationHash.toString()
        };
        console.log("snarkjsInputs", snarkjsInputs);
        const snarkjsInputsPath = path.join(__dirname, "../temp-snarkjs-inputs.json");
        fs.writeFileSync(snarkjsInputsPath, JSON.stringify(snarkjsInputs, null, 2));

        // 4. Ejecutar snarkjs wtns calculate
        const wasmPath = path.join(__dirname, "../zkit/artifacts/circom/registration.circom/RegistrationCircuit_js/RegistrationCircuit.wasm");
        const witnessPath = path.join(__dirname, "../temp-snarkjs-witness.wtns");
        execSync(`snarkjs wtns calculate "${wasmPath}" "${snarkjsInputsPath}" "${witnessPath}"`, { stdio: 'inherit' });

        // 5. Ejecutar snarkjs groth16 prove
        const zkeyPath = path.join(__dirname, "../zkit/artifacts/circom/registration.circom/RegistrationCircuit.groth16.zkey");
        const proofPath = path.join(__dirname, "../temp-register-proof.json");
        const publicPath = path.join(__dirname, "../temp-register-public.json");
        execSync(`snarkjs groth16 prove "${zkeyPath}" "${witnessPath}" "${proofPath}" "${publicPath}"`, { stdio: 'inherit' });

        // 6. Leer proof y public signals
        const proofData = JSON.parse(fs.readFileSync(proofPath, "utf8"));
        const publicSignalsRaw = JSON.parse(fs.readFileSync(publicPath, "utf8"));
        if (!Array.isArray(publicSignalsRaw) || publicSignalsRaw.length !== 5) {
            throw new Error("publicSignals debe ser un array de 5 elementos");
        }
        const publicSignals = [
            publicSignalsRaw[0].toString(),
            publicSignalsRaw[1].toString(),
            publicSignalsRaw[2].toString(),
            publicSignalsRaw[3].toString(),
            publicSignalsRaw[4].toString()
        ] as [string, string, string, string, string];

        // 7. Mapear proof al formato del contrato
        const proof = {
            proofPoints: {
                a: [proofData.pi_a[0].toString(), proofData.pi_a[1].toString()] as [string, string],
                b: [
                    [proofData.pi_b[0][1].toString(), proofData.pi_b[0][0].toString()],
                    [proofData.pi_b[1][1].toString(), proofData.pi_b[1][0].toString()]
                ] as [[string, string], [string, string]],
                c: [proofData.pi_c[0].toString(), proofData.pi_c[1].toString()] as [string, string]
            },
            publicSignals
        };

        // 8. Llamar al contrato
        console.log("📝 Registrando en el contrato...");
        console.log("Proof:", JSON.stringify(proof, null, 2));

        
        const registerTx = await registrar.register(proof);
        await registerTx.wait();
        console.log("✅ Usuario registrado exitosamente!");
        

        // 9. Limpiar archivos temporales
        fs.unlinkSync(snarkjsInputsPath);
        fs.unlinkSync(witnessPath);
        fs.unlinkSync(proofPath);
        fs.unlinkSync(publicPath);
        
    } catch (error) {
        console.error("❌ Error durante el registro:", error);
        // NO borrar archivos temporales en caso de error para debugging
        console.log("🔍 Archivos temporales preservados para debugging:");
        console.log("- Inputs:", path.join(__dirname, "../temp-snarkjs-inputs.json"));
        console.log("- Witness:", path.join(__dirname, "../temp-snarkjs-witness.wtns"));
        console.log("- Proof:", path.join(__dirname, "../temp-register-proof.json"));
        console.log("- Public:", path.join(__dirname, "../temp-register-public.json"));
        process.exitCode = 1;
    }
};

main(); 