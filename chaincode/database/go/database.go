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
	EthAddress string `json:"ethaddress"`
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
    case "queryById":
    	return t.queryById(stub, args) 
    case "getEthAddress": 
	    return t.getEthAddress(stub, args) 
    case "updatePerson":
    	return t.updatePerson(stub, args)
    case "updatePersonByAdmin":
        return t.updatePersonByAdmin(stub, args)
    }
    return shim.Error("Invalid function name")
}

func (t *DatabaseChaincode) initPerson(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error

	//   0          1       2      3                        4
	// "Emp1", "Tuan",   "35",  "Staff/Accountant/Manager"  0xf7D8dA6a7a04aCdAe76421F07CF29f38f93F1Ed2
	if len(args) != 5 {
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
	if len(args[4]) <= 0 {
		return shim.Error("5th argument must be a non-empty string")
	}
	ID:= args[0]
	Name := strings.ToLower(args[1])
	Age, err := strconv.Atoi(args[2])
	if err != nil {
	return shim.Error("1rd argument must be a numeric string")
	}
	Org := strings.ToLower(args[3])
	EthAddress := string(args[4])

	// ==== Check if marble already exists ====
	PersonAsBytes, err := stub.GetState(ID)
	if err != nil {
		return shim.Error("Failed to get person: " + err.Error())
	} else if PersonAsBytes != nil {
		fmt.Println("This person already exists: " + ID)
		return shim.Error("This person already exists: " + ID)
	}

	// ==== Set objectType based on Org ====
	var objectType string
	switch Org {
	case "accountant":
		objectType = "EmployeeAccountant"
	case "staff":
		objectType = "EmployeeStaff"
	case "manager":
		objectType = "EmployeeManager"
	default:
		objectType = "Employee"
	}
	
	person := &person{objectType, ID, Name, Age, Org, EthAddress}
	personJSONasBytes, err := json.Marshal(person)
	if err != nil {
		return shim.Error(err.Error())
	}
	
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

//queryById
func (t *DatabaseChaincode) queryById(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	personAsBytes, _ := stub.GetState(args[0])
	return shim.Success(personAsBytes)
}

func (t *DatabaseChaincode) getEthAddress(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	personAsBytes, err := stub.GetState(args[0])
	if err != nil {
		return shim.Error("Failed to get person: " + err.Error())
	} else if personAsBytes == nil {
		return shim.Error("Person not found")
	}

	var person person
	err = json.Unmarshal(personAsBytes, &person)
	if err != nil {
		return shim.Error("Failed to unmarshal person: " + err.Error())
	}

	return shim.Success([]byte(person.EthAddress))
}

//ham nay danh rieng cho Admin
func (t *DatabaseChaincode) updatePersonByAdmin(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 5 {
		return shim.Error("Incorrect number of arguments. Expecting 5")
	}

	ID := args[0]
	Name := strings.ToLower(args[1])
	Age, err := strconv.Atoi(args[2])
	if err != nil {
		return shim.Error("3rd argument must be a numeric string")
	}
	Org := strings.ToLower(args[3])
	EthAddress := string(args[4])

	// Get the existing person
	personAsBytes, err := stub.GetState(ID)
	if err != nil {
		return shim.Error("Failed to get person: " + err.Error())
	} else if personAsBytes == nil {
		return shim.Error("Person not found")
	}

	var person person
	err = json.Unmarshal(personAsBytes, &person)
	if err != nil {
		return shim.Error("Failed to unmarshal person: " + err.Error())
	}

	// Update the person details
	person.Name = Name
	person.Age = Age
	person.Org = Org
	person.EthAddress = EthAddress

	// Marshal the updated person object to JSON
	personJSONasBytes, err := json.Marshal(person)
	if err != nil {
		return shim.Error(err.Error())
	}

	// Save the updated person back to the ledger
	err = stub.PutState(ID, personJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

func (t *DatabaseChaincode) updatePerson(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	ID := args[0]
	Age, err := strconv.Atoi(args[1])
	if err != nil {
		return shim.Error("2nd argument must be a numeric string")
	}
	EthAddress := string(args[2])

	// Get the existing person
	personAsBytes, err := stub.GetState(ID)
	if err != nil {
		return shim.Error("Failed to get person: " + err.Error())
	} else if personAsBytes == nil {
		return shim.Error("Person not found")
	}

	var person person
	err = json.Unmarshal(personAsBytes, &person)
	if err != nil {
		return shim.Error("Failed to unmarshal person: " + err.Error())
	}

	// Update only the Age and EthAddress fields
	person.Age = Age
	person.EthAddress = EthAddress

	// Marshal the updated person object to JSON
	personJSONasBytes, err := json.Marshal(person)
	if err != nil {
		return shim.Error(err.Error())
	}

	// Save the updated person back to the ledger
	err = stub.PutState(ID, personJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}


func main() {
	err := shim.Start(new(DatabaseChaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}

