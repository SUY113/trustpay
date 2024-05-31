package main

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type MultisignChaincode struct {
}

type Request struct {
	Requester      string   `json:"requester"`
	TargetAccount  string   `json:"targetAccount"`
	Message        string   `json:"message"`
	Responses      map[string]string `json:"responses"`
}

func (t *MultisignChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil)
}

func (t *MultisignChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	switch function {
	case "submitRequest":
		return t.submitRequest(stub, args)
	case "respondToRequest":
		return t.respondToRequest(stub, args)
	case "evaluateRequest":
		return t.evaluateRequest(stub, args)
	case "finalizeRequest":
		return t.finalizeRequest(stub, args)
	default:
		return shim.Error("Invalid invoke function name. Expecting \"submitRequest\", \"respondToRequest\", \"evaluateRequest\", or \"finalizeRequest\"")
	}
}

// Kich ban la 1 nguoi dai dien gui yeu cau toi tat ca ca nguoi con lai xin duoc chuyen coin cho nguoi nay neu moi nguoi cung dong y >=2/3 thi giao dich do dc xac nhan 

func (t *MultisignChaincode) submitRequest(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	requestID := args[0] // La dinh danh cho 1 tien trinh gui yeu cau va nhan dung de xac dinh request nao ung voi respone nao.
	targetAccount := args[1] // thong tin tai khoan ma ban yeu cau duoc nhan tien.

	requester, err := stub.GetCreator()
	if err != nil {
		return shim.Error("Failed to get creator")
	}

	if string(requester) == targetAccount {
		return shim.Error("Requester cannot submit a request to their own account")
	}

	message := "Do you want " + targetAccount + " receive a coin ?"

	request := Request{
		Requester:     hex.EncodeToString(requester),
		TargetAccount: targetAccount,
		Message:       message,
		Responses:     make(map[string]string),
	}

	requestJSON, err := json.Marshal(request)
	if err != nil {
		return shim.Error("Error marshalling request JSON")
	}

	err = stub.PutState(requestID, requestJSON)
	if err != nil {
		return shim.Error("Error saving request to state")
	}

	return shim.Success(nil)
}

func (t *MultisignChaincode) respondToRequest(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	requestID := args[0] // Lấy requestID từ đối số đầu tiên
	response := args[1]

	if response != "yes" && response != "no" {
		return shim.Error("Invalid response. Expecting \"yes\" or \"no\"")
	}

	requestJSON, err := stub.GetState(requestID) // Lấy request từ ledger bằng requestID
	if err != nil {
		return shim.Error("Failed to get request from state")
	} else if requestJSON == nil {
		return shim.Error("Request does not exist")
	}

	var request Request
	err = json.Unmarshal(requestJSON, &request)
	if err != nil {
		return shim.Error("Error unmarshalling request JSON")
	}

	responder, err := stub.GetCreator()
	if err != nil {
		return shim.Error("Failed to get creator")
	}

	responderID := hex.EncodeToString(responder) //ma hoa de co the doc dc
	
	if request.Requester == responderID {
		return shim.Error("Requester cannot respond to their own request")
	}

	if _, exists := request.Responses[responderID]; exists {
		return shim.Error("Responder has already submitted a response")
	}

	fmt.Printf("Message: %s\n", request.Message)

	request.Responses[responderID] = response

	requestJSON, err = json.Marshal(request)
	if err != nil {
		return shim.Error("Error marshalling request JSON")
	}

	err = stub.PutState(requestID, requestJSON) // Lưu cập nhật request vào ledger với cùng requestID
	if err != nil {
		return shim.Error("Error saving response to state")
	}

	return shim.Success(nil)
}

func (t *MultisignChaincode) evaluateRequest(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	requestID := args[0]

	requestJSON, err := stub.GetState(requestID)
	if err != nil {
		return shim.Error("Failed to get request from state")
	} else if requestJSON == nil {
		return shim.Error("Request does not exist")
	}

	var request Request
	err = json.Unmarshal(requestJSON, &request)
	if err != nil {
		return shim.Error("Error unmarshalling request JSON")
	}

	totalResponses := len(request.Responses)
	if totalResponses == 0 {
		return shim.Error("No responses found")
	}

	yesCount := 0
	for _, response := range request.Responses {
		if response == "yes" {
			yesCount++
		}
	}

	message := "Total responses: " + strconv.Itoa(totalResponses) + ", Yes responses: " + strconv.Itoa(yesCount)

	return shim.Success([]byte(message))
}

func (t *MultisignChaincode) finalizeRequest(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	requestID := args[0]

	requestJSON, err := stub.GetState(requestID)
	if err != nil {
		return shim.Error("Failed to get request from state")
	} else if requestJSON == nil {
		return shim.Error("Request does not exist")
	}

	var request Request
	err = json.Unmarshal(requestJSON, &request)
	if err != nil {
		return shim.Error("Error unmarshalling request JSON")
	}

	totalResponses := len(request.Responses)
	if totalResponses == 0 {
		return shim.Error("No responses found")
	}

	yesCount := 0
	for _, response := range request.Responses {
		if response == "yes" {
			yesCount++
		}
	}

	if float64(yesCount) >= (2.0/3.0)*float64(totalResponses) {
		return shim.Success([]byte("Request approved"))
	} else {
		return shim.Success([]byte("Request denied"))
	}
}

func main() {
	err := shim.Start(new(MultisignChaincode))
	if err != nil {
		fmt.Printf("Error starting MultisignChaincode: %s", err)
	}
}
