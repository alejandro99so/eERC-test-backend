import { ethers } from "hardhat";
import { EncryptedERC__factory } from "../typechain-types";
import * as fs from "fs";
import * as path from "path";

const main = async () => {
    const [deployer] = await ethers.getSigners();
    
    // Leer las direcciones del deploy
    const deploymentPath = path.join(__dirname, "../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const encryptedERCAddress = deploymentData.contracts.encryptedERC;
    const registrarAddress = deploymentData.contracts.registrar;
    
    console.log("🔧 Inicializando contrato EncryptedERC...");
    console.log("Contrato:", encryptedERCAddress);
    console.log("Registrar:", registrarAddress);
    console.log("Deployer:", await deployer.getAddress());
    
    // Conectar al contrato
    const encryptedERC = EncryptedERC__factory.connect(encryptedERCAddress, deployer);
    
    // 1. Verificar si el auditor ya está configurado
    const currentAuditor = await encryptedERC.auditor();
    console.log("Auditor actual:", currentAuditor);
    
    if (currentAuditor !== ethers.ZeroAddress) {
        console.log("✅ Auditor ya está configurado");
        return;
    }
    
    // 2. Verificar si el deployer ya está registrado
    console.log("📝 Verificando registro del deployer...");
    
    // Conectar al registrar
    const registrar = await ethers.getContractAt("Registrar", registrarAddress);
    
    const isRegistered = await registrar.isUserRegistered(await deployer.getAddress());
    
    if (!isRegistered) {
        console.log("❌ El deployer no está registrado");
        console.log("💡 Para registrar un usuario, necesitas generar un proof de zero-knowledge");
        console.log("💡 Esto requiere usar las herramientas de zk (zkit) del proyecto");
        console.log("💡 Por ahora, puedes usar un usuario ya registrado como auditor");
        return;
    }
    
    // 3. Configurar el auditor
    console.log("🔐 Configurando auditor...");
    try {
        const setAuditorTx = await encryptedERC.setAuditorPublicKey(await deployer.getAddress());
        await setAuditorTx.wait();
        
        // 4. Verificar configuración
        const auditor = await encryptedERC.auditor();
        const auditorPublicKey = await encryptedERC.auditorPublicKey();
        
        console.log("✅ Auditor configurado exitosamente!");
        console.log("Auditor address:", auditor);
        console.log("Auditor public key X:", auditorPublicKey.x.toString());
        console.log("Auditor public key Y:", auditorPublicKey.y.toString());
        
    } catch (error) {
        console.error("❌ Error configurando auditor:", error);
        throw error;
    }
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 