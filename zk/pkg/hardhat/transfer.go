package hardhat

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/ava-labs/EncryptedERC/pkg/circuits"
	"github.com/ava-labs/EncryptedERC/pkg/helpers"
	"github.com/ava-labs/EncryptedERC/pkg/utils"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/frontend"
)

func Transfer(pp helpers.TestingParams) {
	// Read the input file
	inputBytes, err := os.ReadFile(pp.Input)
	if err != nil {
		panic(fmt.Sprintf("Error reading input file: %v", err))
	}
	
	var inputs Inputs
	err = json.Unmarshal(inputBytes, &inputs)
	if err != nil {
		panic(fmt.Sprintf("Error parsing JSON: %v", err))
	}

	f := func() frontend.Circuit { return &circuits.TransferCircuit{} }

	ccs, pk, vk, err := helpers.LoadCircuit(pp, f)
	if err != nil {
		panic(err)
	}

	witness, err := utils.GenerateWitness(inputs.PubIns, inputs.PrivIns)
	if err != nil {
		panic(err)
	}

	proof, err := groth16.Prove(ccs, pk, witness)
	if err != nil {
		panic(err)
	}

	a, b, c := utils.SetProof(proof)
	utils.WriteProof(pp.Output, &a, &b, &c)

	if pp.Extract {
		helpers.SaveCS(ccs, "TRANSFER")
		helpers.SavePK(pk, "TRANSFER")
		helpers.SaveVK(vk, "TRANSFER")
	}
}
