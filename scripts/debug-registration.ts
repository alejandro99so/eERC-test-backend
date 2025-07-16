import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const main = async () => {
    // Usar PRIVATE_KEY específica para el registro
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY) {
        throw new Error("❌ PRIVATE_KEY no encontrada en variables de entorno");
    }
    
    // Crear wallet con la PRIVATE_KEY
    const wallet = new ethers.Wallet(PRIVATE_KEY, ethers.provider);
    const userAddress = await wallet.getAddress();
    
    // Leer las direcciones del deploy
    const deploymentPath = path.join(__dirname, "../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const registrarAddress = deploymentData.contracts.registrar;
    
    console.log("🔍 Debugging registro en EncryptedERC...");
    console.log("Registrar:", registrarAddress);
    console.log("Usuario a registrar:", userAddress);
    
    // Conectar al contrato usando la wallet específica
    const registrar = await ethers.getContractAt("Registrar", registrarAddress, wallet);
    
    // Leer los archivos temporales
    const inputsPath = path.join(__dirname, "../temp-register-inputs.json");
    const proofPath = path.join(__dirname, "../temp-register-proof.json");
    
    if (!fs.existsSync(inputsPath) || !fs.existsSync(proofPath)) {
        console.error("❌ Archivos temporales no encontrados. Ejecuta register-user-correct.ts primero.");
        return;
    }
    
    const inputs = JSON.parse(fs.readFileSync(inputsPath, "utf8"));
    const proofData = JSON.parse(fs.readFileSync(proofPath, "utf8"));
    
    console.log("\n📋 Datos del proof:");
    console.log("Public inputs:", inputs.publicInputs);
    console.log("Proof points:", proofData.proof);
    
    // Extraer datos del proof
    const publicKeyX = inputs.publicInputs[0];
    const publicKeyY = inputs.publicInputs[1];
    const address = inputs.publicInputs[2];
    const chainId = inputs.publicInputs[3];
    const registrationHash = inputs.publicInputs[4];
    
    console.log("\n🔍 Verificando validaciones del contrato:");
    
    // 1. Verificar si el sender coincide con la cuenta en el proof
    console.log("1. Verificando sender vs account en proof:");
    console.log("   - msg.sender:", userAddress);
    console.log("   - account en proof:", address);
    console.log("   - Coinciden:", userAddress.toLowerCase() === address.toLowerCase() ? "✅" : "❌");
    
    // 2. Verificar chain ID
    const currentChainId = await ethers.provider.getNetwork().then(net => net.chainId);
    console.log("\n2. Verificando chain ID:");
    console.log("   - Chain ID actual:", currentChainId.toString());
    console.log("   - Chain ID en proof:", chainId);
    console.log("   - Coinciden:", currentChainId.toString() === chainId ? "✅" : "❌");
    
    // 3. Verificar registration hash
    console.log("\n3. Verificando registration hash:");
    console.log("   - Registration hash:", registrationHash);
    console.log("   - Tamaño (bits):", BigInt(registrationHash).toString(2).length);
    
    // Verificar si es menor que BabyJubJub.Q
    // BabyJubJub.Q = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    const babyJubQ = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    const hashValue = BigInt(registrationHash);
    console.log("   - BabyJubJub.Q:", babyJubQ.toString());
    console.log("   - Hash < Q:", hashValue < babyJubQ ? "✅" : "❌");
    
    // 4. Verificar si el usuario ya está registrado
    console.log("\n4. Verificando si usuario ya está registrado:");
    const isRegistered = await registrar.isUserRegistered(userAddress);
    console.log("   - Usuario registrado:", isRegistered ? "✅" : "❌");
    
    // 5. Verificar si el registration hash ya está usado
    console.log("\n5. Verificando si registration hash ya está usado:");
    const isHashRegistered = await registrar.isRegistered(registrationHash);
    console.log("   - Hash registrado:", isHashRegistered ? "✅" : "❌");
    
    // 6. Verificar el verifier contract
    console.log("\n6. Verificando verifier contract:");
    const verifierAddress = await registrar.registrationVerifier();
    console.log("   - Verifier address:", verifierAddress);
    
    // 7. Formatear proof para verificación
    console.log("\n7. Formateando proof para verificación:");
    const proof = {
        proofPoints: {
            a: [proofData.proof[0], proofData.proof[1]] as [string, string],
            b: [[proofData.proof[2], proofData.proof[3]], [proofData.proof[4], proofData.proof[5]]] as [[string, string], [string, string]],
            c: [proofData.proof[6], proofData.proof[7]] as [string, string]
        },
        publicSignals: [
            publicKeyX,
            publicKeyY,
            address,
            chainId,
            registrationHash
        ] as [string, string, string, string, string]
    };
    
    console.log("   - Proof formateado correctamente: ✅");
    
    // 8. Intentar verificar el proof directamente
    console.log("\n8. Verificando proof directamente:");
    try {
        const verifier = await ethers.getContractAt("IRegistrationVerifier", verifierAddress);
        
        const pointA: [string, string] = [proof.proofPoints.a[0], proof.proofPoints.a[1]];
        const pointB: [[string, string], [string, string]] = [
            [proof.proofPoints.b[0][0], proof.proofPoints.b[0][1]], 
            [proof.proofPoints.b[1][0], proof.proofPoints.b[1][1]]
        ];
        const pointC: [string, string] = [proof.proofPoints.c[0], proof.proofPoints.c[1]];
        const input: [string, string, string, string, string] = proof.publicSignals;
        
        console.log("   - Llamando verifier.verifyProof...");
        const verified = await verifier.verifyProof(pointA, pointB, pointC, input);
        console.log("   - Proof verificado:", verified ? "✅" : "❌");
        
    } catch (error) {
        console.error("   - Error verificando proof:", error);
    }
    
    console.log("\n🎯 Resumen de validaciones:");
    console.log("1. Sender vs Account:", userAddress.toLowerCase() === address.toLowerCase() ? "✅" : "❌");
    console.log("2. Chain ID:", currentChainId.toString() === chainId ? "✅" : "❌");
    console.log("3. Registration Hash válido:", hashValue < babyJubQ ? "✅" : "❌");
    console.log("4. Usuario no registrado:", !isRegistered ? "✅" : "❌");
    console.log("5. Hash no usado:", !isHashRegistered ? "✅" : "❌");
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 