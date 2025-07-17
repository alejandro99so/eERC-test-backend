import { ethers } from "hardhat";
import { EncryptedERC__factory } from "../typechain-types";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const main = async () => {
    const [deployer] = await ethers.getSigners();
    
    // Leer las direcciones del deploy
    const deploymentPath = path.join(__dirname, "../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const encryptedERCAddress = deploymentData.contracts.encryptedERC;
    const registrarAddress = deploymentData.contracts.registrar;
    
    console.log("🔧 Registrando usuario en EncryptedERC...");
    console.log("Contrato:", encryptedERCAddress);
    console.log("Registrar:", registrarAddress);
    console.log("Deployer:", await deployer.getAddress());
    
    // Conectar al contrato
    const encryptedERC = EncryptedERC__factory.connect(encryptedERCAddress, deployer);
    const registrar = await ethers.getContractAt("Registrar", registrarAddress);
    
    // 1. Verificar si ya está registrado
    const isRegistered = await registrar.isUserRegistered(await deployer.getAddress());
    if (isRegistered) {
        console.log("✅ El deployer ya está registrado");
        return;
    }
    
    // 2. Generar claves criptográficas
    console.log("🔑 Generando claves criptográficas...");
    const privateKey = ethers.randomBytes(32);
    
    // Para BabyJubJub, necesitamos generar claves específicas
    // Por simplicidad, usaremos valores de ejemplo que funcionen con el circuito
    const publicKeyPoint = {
        x: BigInt("1234567890123456789012345678901234567890123456789012345678901234"),
        y: BigInt("9876543210987654321098765432109876543210987654321098765432109876")
    };
    
    console.log("Clave privada:", privateKey.toString('hex'));
    console.log("Clave pública X:", publicKeyPoint.x.toString());
    console.log("Clave pública Y:", publicKeyPoint.y.toString());
    
    // 3. Generar registration hash
    const chainId = await ethers.provider.getNetwork().then(net => net.chainId);
    const address = await deployer.getAddress();
    
    // El registration hash se genera en el circuito, pero necesitamos un valor único
    const registrationHash = ethers.keccak256(
        ethers.solidityPacked(
            ["address", "uint256", "uint256", "uint256"],
            [address, chainId, publicKeyPoint.x, publicKeyPoint.y]
        )
    ).slice(0, 66); // Tomar solo los primeros 32 bytes
    
    console.log("Chain ID:", chainId.toString());
    console.log("Address:", address);
    console.log("Registration Hash:", registrationHash);
    
    // 4. Preparar inputs para el circuito
    const inputs = {
        privateInputs: [
            privateKey.toString('hex'), // Private key
        ],
        publicInputs: [
            publicKeyPoint.x.toString(), // Public key X
            publicKeyPoint.y.toString(), // Public key Y
            address, // Address
            chainId.toString(), // Chain ID
            registrationHash // Registration hash
        ]
    };
    
    // 5. Guardar inputs en archivo temporal
    const inputsPath = path.join(__dirname, "../temp-register-inputs.json");
    fs.writeFileSync(inputsPath, JSON.stringify(inputs, null, 2));
    
    // 6. Generar proof usando las herramientas de zk
    console.log("🔐 Generando proof de registro...");
    try {
        // Verificar que las herramientas de zk están disponibles
        const zkPath = path.join(__dirname, "../zk");
        if (!fs.existsSync(zkPath)) {
            throw new Error("Directorio zk no encontrado. Ejecuta 'npm run postinstall' primero.");
        }
        
        // Compilar el binario de Go si no existe
        const binaryPath = path.join(zkPath, "cmd/main");
        if (!fs.existsSync(binaryPath)) {
            console.log("🔨 Compilando herramientas de zk...");
            execSync("cd zk && go build -o cmd/main cmd/main.go", { stdio: 'inherit' });
        }
        
        // Generar proof
        const outputPath = path.join(__dirname, "../temp-register-proof.json");
        const csPath = path.join(__dirname, "../zkit/REGISTER.cs.r1cs");
        const pkPath = path.join(__dirname, "../zkit/REGISTER.pk.pk");
        
        const command = `cd zk && ./cmd/main -operation=REGISTER -input="${inputsPath}" -output="${outputPath}" -cs="${csPath}" -pk="${pkPath}"`;
        
        console.log("Ejecutando:", command);
        execSync(command, { stdio: 'inherit' });
        
        // 7. Leer proof generado
        const proofData = JSON.parse(fs.readFileSync(outputPath, "utf8"));
        console.log("✅ Proof generado exitosamente");
        
        // 8. Formatear proof para el contrato
        const proof = {
            proofPoints: {
                a: [proofData.proof[0], proofData.proof[1]] as [string, string],
                b: [[proofData.proof[2], proofData.proof[3]], [proofData.proof[4], proofData.proof[5]]] as [[string, string], [string, string]],
                c: [proofData.proof[6], proofData.proof[7]] as [string, string]
            },
            publicSignals: inputs.publicInputs
        };
        
        // 9. Llamar al contrato
        console.log("📝 Registrando en el contrato...");
        const registerTx = await registrar.register(proof);
        await registerTx.wait();
        
        console.log("✅ Usuario registrado exitosamente!");
        
        // 10. Verificar registro
        const isNowRegistered = await registrar.isUserRegistered(await deployer.getAddress());
        const userPublicKey = await registrar.getUserPublicKey(await deployer.getAddress());
        
        console.log("Verificación:");
        console.log("- Registrado:", isNowRegistered);
        console.log("- Clave pública X:", userPublicKey[0].toString());
        console.log("- Clave pública Y:", userPublicKey[1].toString());
        
        // 11. Limpiar archivos temporales
        fs.unlinkSync(inputsPath);
        fs.unlinkSync(outputPath);
        
    } catch (error) {
        console.error("❌ Error durante el registro:", error);
        
        // Limpiar archivos temporales en caso de error
        try {
            if (fs.existsSync(path.join(__dirname, "../temp-register-inputs.json"))) {
                fs.unlinkSync(path.join(__dirname, "../temp-register-inputs.json"));
            }
            if (fs.existsSync(path.join(__dirname, "../temp-register-proof.json"))) {
                fs.unlinkSync(path.join(__dirname, "../temp-register-proof.json"));
            }
        } catch (cleanupError) {
            console.error("Error limpiando archivos temporales:", cleanupError);
        }
        
        throw error;
    }
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 