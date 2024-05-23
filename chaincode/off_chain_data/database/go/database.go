package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type DatabaseChaincode struct {
}

type person struct {
	ObjectType string `json:"docType"`
	ID       string `json:"id"`
	Name     string `json:"name"`
	Age      int    `json:"age"`
	Org      string `json:"org"`
}

func (t *DatabaseChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil)
}


func (t *DatabaseChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
    function, args := stub.GetFunctionAndParameters()
    
    switch function {
    case "initPerson":
    	return t.initPerson(stub, args)
    case "queryAll":
    	return t.queryAll(stub)  
    }
    return shim.Error("Invalid function name")
}

func (t *DatabaseChaincode) initPerson(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error

	//   0          1       2      3
	// "Emp1", "Tuan",   "35",  "Staff/Accountant/Manager"
	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 4")
	}

	// ==== Input sanitation ====
	fmt.Println("- start init person")
	if len(args[0]) <= 0 {
		return shim.Error("1st argument must be a non-empty string")
	}
	if len(args[1]) <= 0 {
		return shim.Error("2nd argument must be a non-empty string")
	}
	if len(args[2]) <= 0 {
		return shim.Error("3rd argument must be a non-empty string")
	}
	if len(args[3]) <= 0 {
		return shim.Error("4th argument must be a non-empty string")
	}
	ID:= args[0]
	Name := strings.ToLower(args[1])
	Age, err := strconv.Atoi(args[2])
	if err != nil {
	return shim.Error("1rd argument must be a numeric string")
	}
	Org := strings.ToLower(args[3])

	// ==== Check if marble already exists ====
	PersonAsBytes, err := stub.GetState(ID)
	if err != nil {
		return shim.Error("Failed to get person: " + err.Error())
	} else if PersonAsBytes != nil {
		fmt.Println("This person already exists: " + ID)
		return shim.Error("This person already exists: " + ID)
	}

	// ==== Create marble object and marshal to JSON ====
	objectType := "Employee"
	person := &person{objectType, ID, Name, Age, Org}
	personJSONasBytes, err := json.Marshal(person)
	if err != nil {
		return shim.Error(err.Error())
	}
	//Alternatively, build the marble json string manually if you don't want to use struct marshalling
	//marbleJSONasString := `{"docType":"Marble",  "name": "` + marbleName + `", "color": "` + color + `", "size": ` + strconv.Itoa(size) + `, "owner": "` + owner + `"}`
	//marbleJSONasBytes := []byte(str)

	// === Save marble to state ===
	err = stub.PutState(ID, personJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}
	
	// ==== Marble saved and indexed. Return success ====
	fmt.Println("- end init person")
	return shim.Success(nil)
}

func (t *DatabaseChaincode) queryAll(stub shim.ChaincodeStubInterface) pb.Response {
	startKey := ""
	endKey := ""

	// Get all the keys from startKey to endKey
	resultsIterator, err := stub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// Buffer for storing the result
	var buffer strings.Builder
	buffer.WriteString("[")

	// Flag for adding a comma between JSON objects
	bArrayMemberAlreadyWritten := false

	// Iterate through the result set and collect each key and value
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}

		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}

		// Write the JSON object for each record
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")

		// Update the flag
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	// Log the result
	fmt.Printf("- queryAll:\n%s\n", buffer.String())

	// Return the result as shim.Success
	return shim.Success([]byte(buffer.String()))
}

func main() {
	err := shim.Start(new(DatabaseChaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}

