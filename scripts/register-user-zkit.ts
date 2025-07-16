import { ethers, zkit } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { Base8, mulPointEscalar, subOrder } from "@zk-kit/baby-jubjub";
import { formatPrivKeyForBabyJub, genPrivKey } from "maci-crypto";
import { poseidon3 } from "poseidon-lite";
import type { RegistrationCircuit } from "../generated-types/zkit";

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
    
    console.log("🔧 Registrando usuario en EncryptedERC usando zkit...");
    console.log("Registrar:", registrarAddress);
    console.log("Usuario a registrar:", userAddress);
    
    // Verificar balance de gas
    const balance = await ethers.provider.getBalance(userAddress);
    console.log("💰 Balance actual:", ethers.formatEther(balance), "AVAX");
    
    if (balance === 0n) {
        throw new Error("❌ La cuenta no tiene fondos para pagar gas. Necesitas enviar ETH a esta dirección.");
    }
    
    // Verificar si hay suficiente gas (estimación aproximada)
    const estimatedGas = ethers.parseUnits("0.01", "ether"); // Estimación conservadora
    if (balance < estimatedGas) {
        console.warn("⚠️  Balance bajo. Podría no ser suficiente para la transacción.");
        console.warn("   Balance actual:", ethers.formatEther(balance), "AVAX");
        console.warn("   Estimación necesaria:", ethers.formatEther(estimatedGas), "AVAX");
    }
    
    // Conectar al contrato usando la wallet específica
    const registrar = await ethers.getContractAt("Registrar", registrarAddress, wallet);
    
    // 1. Verificar si ya está registrado
    const isRegistered = await registrar.isUserRegistered(userAddress);
    if (isRegistered) {
        console.log("✅ El usuario ya está registrado");
        return;
    }
    
    // 2. Generar claves criptográficas correctamente usando las librerías
    console.log("🔑 Generando claves criptográficas...");
    
    // Generar clave privada usando maci-crypto
    const privateKey = genPrivKey();
    console.log("Clave privada (raw):", privateKey.toString());
    
    // Formatear clave privada para BabyJubJub
    const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder;
    console.log("Clave privada (formateada):", formattedPrivateKey.toString());
    
    // Generar clave pública usando BabyJubJub
    const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) => BigInt(x));
    console.log("Clave pública X:", publicKey[0].toString());
    console.log("Clave pública Y:", publicKey[1].toString());
    
    // 3. Generar registration hash usando poseidon3
    const chainId = await ethers.provider.getNetwork().then(net => net.chainId);
    const address = userAddress;
    
    const registrationHash = poseidon3([
        BigInt(chainId),
        formattedPrivateKey,
        BigInt(address),
    ]);
    
    console.log("Chain ID:", chainId.toString());
    console.log("Address:", address);
    console.log("Registration Hash:", registrationHash.toString());
    
    // 4. Generar proof usando zkit
    console.log("🔐 Generando proof de registro usando zkit...");
    try {
        // Obtener el circuito de registro
        const circuit = await zkit.getCircuit("RegistrationCircuit");
        const registrationCircuit = circuit as unknown as RegistrationCircuit;
        
        // Preparar inputs para el circuito
        const input = {
            SenderPrivateKey: formattedPrivateKey,
            SenderPublicKey: [publicKey[0], publicKey[1]],
            SenderAddress: BigInt(address),
            ChainID: BigInt(chainId),
            RegistrationHash: registrationHash,
        };
        
        console.log("📋 Inputs para el circuito:", input);
        
        // Generar proof
        const proof = await registrationCircuit.generateProof(input);
        console.log("✅ Proof generado exitosamente usando zkit");
        
        // Generar calldata para el contrato
        const calldata = await registrationCircuit.generateCalldata(proof);
        console.log("✅ Calldata generado exitosamente");
        
        // 5. Llamar al contrato
        console.log("📝 Registrando en el contrato...");
        try {
            const registerTx = await registrar.register(calldata);
            await registerTx.wait();
            
            console.log("✅ Usuario registrado exitosamente!");
        } catch (contractError) {
            console.error("❌ Error en el contrato: ", contractError);
            
            // Extraer el mensaje de error del contrato
            if (contractError instanceof Error) {
                const errorMessage = contractError.message;
                
                // Buscar el mensaje de error específico del contrato
                if (errorMessage.includes("execution reverted")) {
                    // Intentar extraer el mensaje de error personalizado
                    const revertMatch = errorMessage.match(/execution reverted: (.+)/);
                    if (revertMatch && revertMatch[1]) {
                        console.error("Mensaje de error del contrato:", revertMatch[1]);
                    } else {
                        console.error("Contrato revertido sin mensaje específico");
                    }
                } else {
                    console.error("Error completo:", errorMessage);
                }
                
                // Mostrar información adicional para debugging
                console.error("Detalles del error:");
                console.error("- Mensaje:", errorMessage);
                console.error("- Stack:", contractError.stack);
            } else {
                console.error("Error desconocido:", contractError);
            }
            
            throw contractError;
        }
        
        // 6. Verificar registro
        const isNowRegistered = await registrar.isUserRegistered(userAddress);
        const userPublicKey = await registrar.getUserPublicKey(userAddress);
        
        console.log("Verificación:");
        console.log("- Registrado:", isNowRegistered);
        console.log("- Clave pública X:", userPublicKey[0].toString());
        console.log("- Clave pública Y:", userPublicKey[1].toString());
        
        // 7. Guardar las claves generadas para uso futuro
        const userKeys = {
            address: address,
            privateKey: {
                raw: privateKey.toString(),
                formatted: formattedPrivateKey.toString()
            },
            publicKey: {
                x: publicKey[0].toString(),
                y: publicKey[1].toString()
            },
            registrationHash: registrationHash.toString()
        };
        
        const keysPath = path.join(__dirname, "../deployments/user-keys.json");
        fs.writeFileSync(keysPath, JSON.stringify(userKeys, null, 2));
        console.log("🔑 Claves del usuario guardadas en:", keysPath);
        
    } catch (error) {
        console.error("❌ Error durante el registro:");
        
        // Mostrar información detallada del error
        if (error instanceof Error) {
            console.error("Tipo de error:", error.constructor.name);
            console.error("Mensaje:", error.message);
            
            // Si es un error de contrato, ya se manejó arriba
            if (error.message.includes("execution reverted")) {
                console.error("Este es un error de ejecución del contrato");
            }
            
            // Mostrar stack trace para debugging
            if (error.stack) {
                console.error("Stack trace:");
                console.error(error.stack);
            }
        } else {
            console.error("Error desconocido:", error);
        }
        
        throw error;
    }
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 