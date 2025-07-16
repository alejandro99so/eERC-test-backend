import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const main = async () => {
    console.log("🔍 Verificando estado de inicialización del sistema EncryptedERC...\n");
    
    // Leer las direcciones del deployment más reciente
    const deploymentPath = path.join(__dirname, "../deployments/latest-fuji.json");
    if (!fs.existsSync(deploymentPath)) {
        console.error("❌ No se encontró archivo de deployment. Ejecuta el deployment primero.");
        return;
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("📋 Datos del deployment:");
    console.log("- Red:", deploymentData.network);
    console.log("- Deployer:", deploymentData.deployer);
    console.log("- Timestamp:", deploymentData.deploymentTimestamp);
    console.log("- Modo:", deploymentData.metadata.isConverter ? "Converter" : "Standalone");
    console.log("- Decimales:", deploymentData.metadata.decimals);
    console.log();
    
    // Verificar que todos los contratos estén desplegados
    console.log("🏗️  Verificando contratos desplegados:");
    
    const contracts = deploymentData.contracts;
    const contractChecks = [
        { name: "Registration Verifier", address: contracts.registrationVerifier },
        { name: "Mint Verifier", address: contracts.mintVerifier },
        { name: "Withdraw Verifier", address: contracts.withdrawVerifier },
        { name: "Transfer Verifier", address: contracts.transferVerifier },
        { name: "Burn Verifier", address: contracts.burnVerifier },
        { name: "BabyJubJub Library", address: contracts.babyJubJub },
        { name: "Registrar", address: contracts.registrar },
        { name: "EncryptedERC", address: contracts.encryptedERC },
        { name: "Test ERC20", address: contracts.testERC20 },
    ];
    
    for (const contract of contractChecks) {
        try {
            const code = await ethers.provider.getCode(contract.address);
            const isDeployed = code !== "0x";
            console.log(`  ${isDeployed ? "✅" : "❌"} ${contract.name}: ${contract.address} ${isDeployed ? "(desplegado)" : "(NO desplegado)"}`);
        } catch (error) {
            console.log(`  ❌ ${contract.name}: ${contract.address} (error verificando)`);
        }
    }
    console.log();
    
    // Verificar estado del EncryptedERC
    console.log("🔐 Verificando estado del EncryptedERC:");
    try {
        const encryptedERC = await ethers.getContractAt("EncryptedERC", contracts.encryptedERC);
        
        // Verificar auditor
        const auditor = await encryptedERC.auditor();
        const auditorPublicKey = await encryptedERC.auditorPublicKey();
        console.log(`  ${auditor !== ethers.ZeroAddress ? "✅" : "❌"} Auditor configurado: ${auditor}`);
        if (auditor !== ethers.ZeroAddress) {
            console.log(`    - Clave pública X: ${auditorPublicKey.x.toString()}`);
            console.log(`    - Clave pública Y: ${auditorPublicKey.y.toString()}`);
        }
        
        // Verificar registrar
        const registrar = await encryptedERC.registrar();
        console.log(`  ${registrar !== ethers.ZeroAddress ? "✅" : "❌"} Registrar configurado: ${registrar}`);
        
        // Verificar verifiers
        const mintVerifier = await encryptedERC.mintVerifier();
        const withdrawVerifier = await encryptedERC.withdrawVerifier();
        const transferVerifier = await encryptedERC.transferVerifier();
        const burnVerifier = await encryptedERC.burnVerifier();
        
        console.log(`  ${mintVerifier !== ethers.ZeroAddress ? "✅" : "❌"} Mint Verifier: ${mintVerifier}`);
        console.log(`  ${withdrawVerifier !== ethers.ZeroAddress ? "✅" : "❌"} Withdraw Verifier: ${withdrawVerifier}`);
        console.log(`  ${transferVerifier !== ethers.ZeroAddress ? "✅" : "❌"} Transfer Verifier: ${transferVerifier}`);
        console.log(`  ${burnVerifier !== ethers.ZeroAddress ? "✅" : "❌"} Burn Verifier: ${burnVerifier}`);
        
        // Verificar si es converter
        const isConverter = await encryptedERC.isConverter();
        console.log(`  ${isConverter ? "✅" : "❌"} Modo Converter: ${isConverter}`);
        
    } catch (error) {
        console.error("  ❌ Error verificando EncryptedERC:", error);
    }
    console.log();
    
    // Verificar estado del Registrar
    console.log("📝 Verificando estado del Registrar:");
    try {
        const registrar = await ethers.getContractAt("Registrar", contracts.registrar);
        
        // Verificar registration verifier
        const registrationVerifier = await registrar.registrationVerifier();
        console.log(`  ${registrationVerifier !== ethers.ZeroAddress ? "✅" : "❌"} Registration Verifier: ${registrationVerifier}`);
        
        // Verificar usuarios registrados
        const deployer = deploymentData.deployer;
        const isDeployerRegistered = await registrar.isUserRegistered(deployer);
        console.log(`  ${isDeployerRegistered ? "✅" : "❌"} Deployer registrado: ${deployer}`);
        
        if (isDeployerRegistered) {
            const userPublicKey = await registrar.getUserPublicKey(deployer);
            console.log(`    - Clave pública X: ${userPublicKey[0].toString()}`);
            console.log(`    - Clave pública Y: ${userPublicKey[1].toString()}`);
        }
        
    } catch (error) {
        console.error("  ❌ Error verificando Registrar:", error);
    }
    console.log();
    
    // Verificar estado del Test ERC20
    console.log("🪙 Verificando estado del Test ERC20:");
    try {
        const testERC20 = await ethers.getContractAt("SimpleERC20", contracts.testERC20);
        
        const name = await testERC20.name();
        const symbol = await testERC20.symbol();
        const decimals = await testERC20.decimals();
        const totalSupply = await testERC20.totalSupply();
        const deployerBalance = await testERC20.balanceOf(deploymentData.deployer);
        
        console.log(`  ✅ Nombre: ${name}`);
        console.log(`  ✅ Símbolo: ${symbol}`);
        console.log(`  ✅ Decimales: ${decimals}`);
        console.log(`  ✅ Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
        console.log(`  ✅ Balance del deployer: ${ethers.formatUnits(deployerBalance, decimals)} ${symbol}`);
        
    } catch (error) {
        console.error("  ❌ Error verificando Test ERC20:", error);
    }
    console.log();
    
    // Verificar claves del usuario
    console.log("🔑 Verificando claves del usuario:");
    const userKeysPath = path.join(__dirname, "../deployments/user-keys.json");
    if (fs.existsSync(userKeysPath)) {
        const userKeys = JSON.parse(fs.readFileSync(userKeysPath, "utf8"));
        console.log(`  ✅ Claves del usuario encontradas para: ${userKeys.address}`);
        console.log(`    - Clave pública X: ${userKeys.publicKey.x}`);
        console.log(`    - Clave pública Y: ${userKeys.publicKey.y}`);
        console.log(`    - Registration Hash: ${userKeys.registrationHash}`);
    } else {
        console.log("  ❌ No se encontraron claves del usuario");
    }
    console.log();
    
    // Resumen de inicialización
    console.log("🎯 Resumen de inicialización:");
    console.log("Para que el sistema esté completamente inicializado, necesitas:");
    console.log("1. ✅ Todos los contratos desplegados");
    console.log("2. ✅ Auditor configurado");
    console.log("3. ✅ Al menos un usuario registrado");
    console.log("4. ✅ Tokens ERC20 disponibles (en modo converter)");
    console.log("5. ✅ Claves criptográficas generadas");
    
    // Verificar si el frontend puede conectarse
    console.log("\n🌐 Para el frontend, asegúrate de:");
    console.log("- Usar la red correcta (Fuji Testnet - Chain ID 43113)");
    console.log("- Tener el archivo de deployment actualizado");
    console.log("- Conectar con la wallet correcta");
    console.log("- Tener fondos para gas");
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 