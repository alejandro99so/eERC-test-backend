import { ethers } from "hardhat";
import { EncryptedERC__factory } from "../typechain-types";
import * as fs from "fs";
import * as path from "path";

// Leer las direcciones del deployment más reciente
const deploymentPath = path.join(__dirname, "../deployments/latest-fuji.json");
const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

const eERCAddress = deploymentData.contracts.encryptedERC;
const auditorPublicKeyAddress = "0x38332d73dC01548fC6710Acbbe8116516111781A" as any;
const main = async () => {
    const [deployer] = await ethers.getSigners();

    const encryptedERC = await EncryptedERC__factory.connect(eERCAddress, deployer);
    let auditor: any;
    try {
        auditor = await encryptedERC.setAuditorPublicKey(auditorPublicKeyAddress);
        const receipt = await auditor.wait();
        console.log("Transaction confirmed in block:", receipt?.blockNumber);
     
         const auditorAddress = await encryptedERC.auditor();
         const auditorPublicKey = await encryptedERC.auditorPublicKey();
         
         console.log("✅ Auditor successfully configured");
         console.log("Auditor address:", auditorAddress);
         console.log("Auditor public key X:", auditorPublicKey.x.toString());
         console.log("Auditor public key Y:", auditorPublicKey.y.toString());
         
    } catch (error) {
        console.error("❌ Error setting auditor:", error);
        
        // Mostrar más detalles del error
        if (error instanceof Error) {
            console.error("Error message:", error.message);
        }
    }

    
};

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
