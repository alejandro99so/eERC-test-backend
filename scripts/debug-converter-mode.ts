import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const main = async () => {
    console.log("🔍 Debugging modo converter del EncryptedERC...\n");
    
    // Leer las direcciones del deployment más reciente
    const deploymentPath = path.join(__dirname, "../deployments/latest-fuji.json");
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    const encryptedERCAddress = deploymentData.contracts.encryptedERC;
    console.log("📋 EncryptedERC address:", encryptedERCAddress);
    console.log("📋 Deployment metadata isConverter:", deploymentData.metadata.isConverter);
    console.log();
    
    // Conectar al contrato
    const encryptedERC = await ethers.getContractAt("EncryptedERC", encryptedERCAddress);
    
    console.log("🔐 Verificando funciones del EncryptedERC:");
    
    try {
        // Verificar isConverter
        const isConverter = await encryptedERC.isConverter();
        console.log(`  isConverter(): ${isConverter}`);
        
        // Verificar otras propiedades importantes
        const name = await encryptedERC.name();
        const symbol = await encryptedERC.symbol();
        const decimals = await encryptedERC.decimals();
        
        console.log(`  name(): "${name}"`);
        console.log(`  symbol(): "${symbol}"`);
        console.log(`  decimals(): ${decimals}`);
        
        // Verificar si tiene auditor
        const auditor = await encryptedERC.auditor();
        const hasAuditor = auditor !== ethers.ZeroAddress;
        console.log(`  auditor(): ${auditor} (${hasAuditor ? "configurado" : "NO configurado"})`);
        
        // Verificar registrar
        const registrar = await encryptedERC.registrar();
        const hasRegistrar = registrar !== ethers.ZeroAddress;
        console.log(`  registrar(): ${registrar} (${hasRegistrar ? "configurado" : "NO configurado"})`);
        
        // Verificar verifiers
        const mintVerifier = await encryptedERC.mintVerifier();
        const withdrawVerifier = await encryptedERC.withdrawVerifier();
        const transferVerifier = await encryptedERC.transferVerifier();
        const burnVerifier = await encryptedERC.burnVerifier();
        
        console.log(`  mintVerifier(): ${mintVerifier}`);
        console.log(`  withdrawVerifier(): ${withdrawVerifier}`);
        console.log(`  transferVerifier(): ${transferVerifier}`);
        console.log(`  burnVerifier(): ${burnVerifier}`);
        
        // Verificar si el contrato tiene código
        const code = await ethers.provider.getCode(encryptedERCAddress);
        console.log(`  Código del contrato: ${code !== "0x" ? "presente" : "NO presente"}`);
        
        // Verificar si podemos llamar a funciones básicas
        console.log("\n🧪 Probando llamadas básicas:");
        
        // Intentar obtener el owner
        try {
            const owner = await encryptedERC.owner();
            console.log(`  owner(): ${owner}`);
        } catch (error) {
            console.log(`  owner(): Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Verificar si hay tokens registrados (modo converter)
        try {
            const tokens = await encryptedERC.getTokens();
            console.log(`  getTokens(): ${tokens.length} tokens registrados`);
        } catch (error) {
            console.log(`  getTokens(): Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Verificar si el test token está registrado
        const testTokenAddress = deploymentData.contracts.testERC20;
        try {
            const tokens = await encryptedERC.getTokens();
            const tokenId = tokens.findIndex(token => token.toLowerCase() === testTokenAddress.toLowerCase());
            console.log(`  Test token registrado: ${tokenId >= 0 ? `ID ${tokenId}` : 'NO registrado'}`);
        } catch (error) {
            console.log(`  Verificación de test token: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        console.log("\n🎯 Análisis:");
        if (isConverter) {
            console.log("✅ El contrato está en modo converter");
        } else {
            console.log("❌ El contrato NO está en modo converter");
        }
        
        if (hasAuditor && hasRegistrar) {
            console.log("✅ Auditor y Registrar configurados");
        } else {
            console.log("❌ Faltan Auditor o Registrar");
        }
        
        // Verificar si el problema está en el frontend
        console.log("\n🌐 Para el frontend:");
        console.log("Asegúrate de que el frontend esté:");
        console.log("1. Conectado a la red correcta (Fuji Testnet - 43113)");
        console.log("2. Usando la dirección correcta del EncryptedERC");
        console.log("3. Llamando a isConverter() correctamente");
        console.log("4. Esperando a que la llamada se complete antes de verificar");
        
    } catch (error) {
        console.error("❌ Error verificando EncryptedERC:", error);
        console.error("Detalles:", error instanceof Error ? error.message : 'Unknown error');
    }
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 