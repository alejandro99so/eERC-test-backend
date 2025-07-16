import { ethers } from "hardhat";
import { deployLibrary, deployVerifiers } from "../test/helpers";
import { EncryptedERC__factory } from "../typechain-types";
import { DECIMALS } from "./constants";
import * as fs from "fs";
import * as path from "path";

const main = async () => {
	// get deployer
	const [deployer] = await ethers.getSigners();

	// deploy verifiers
	// if true, deploys verifiers for prod, generated with proper trusted setup
	const {
		registrationVerifier,
		mintVerifier,
		withdrawVerifier,
		transferVerifier,
		burnVerifier,
	} = await deployVerifiers(deployer);

	// deploy babyjub library
	const babyJubJub = await deployLibrary(deployer);

	// deploy registrar contract
	const registrarFactory = await ethers.getContractFactory("Registrar");
	const registrar = await registrarFactory.deploy(registrationVerifier);
	await registrar.waitForDeployment();

	// deploy eERC20
	const encryptedERCFactory = new EncryptedERC__factory({
		"contracts/libraries/BabyJubJub.sol:BabyJubJub": babyJubJub,
	});
	const encryptedERC_ = await encryptedERCFactory.connect(deployer).deploy({
		registrar: registrar.target,
		isConverter: false, // This is a standalone eERC
		name: "Test",
		symbol: "TEST",
		mintVerifier,
		withdrawVerifier,
		transferVerifier,
		burnVerifier,
		decimals: DECIMALS,
	});
	await encryptedERC_.waitForDeployment();

	// Create deployment data object
	const deploymentData = {
		network: "fuji",
		deployer: deployer.address,
		deploymentTimestamp: new Date().toISOString(),
		contracts: {
			registrationVerifier: registrationVerifier,
			mintVerifier: mintVerifier,
			withdrawVerifier: withdrawVerifier,
			transferVerifier: transferVerifier,
			burnVerifier: burnVerifier,
			babyJubJub: babyJubJub,
			registrar: registrar.target,
			encryptedERC: encryptedERC_.target,
		},
		metadata: {
			isConverter: false,
			decimals: DECIMALS,
			tokenName: "Test",
			tokenSymbol: "TEST",
		}
	};

	// Display in console
	console.table({
		registrationVerifier,
		mintVerifier,
		withdrawVerifier,
		transferVerifier,
		babyJubJub,
		registrar: registrar.target,
		encryptedERC: encryptedERC_.target,
	});

	// Save to JSON file
	const outputDir = path.join(__dirname, "../deployments");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const fileName = `deployment-standalone-fuji-${Date.now()}.json`;
	const filePath = path.join(outputDir, fileName);
	
	fs.writeFileSync(filePath, JSON.stringify(deploymentData, null, 2));
	
	console.log("\n📁 Deployment data saved to:", filePath);
	console.log("🔗 You can import this file in your frontend like:");
	console.log(`   import deploymentData from './deployments/${fileName}';`);
	
	// Also create a latest.json file for easy access
	const latestFilePath = path.join(outputDir, "latest-standalone-fuji.json");
	fs.writeFileSync(latestFilePath, JSON.stringify(deploymentData, null, 2));
	console.log("📄 Latest deployment also saved to: deployments/latest-standalone-fuji.json");
};

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
