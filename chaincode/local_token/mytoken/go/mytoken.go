package main

import (
    "encoding/json"
    "fmt"
    "strconv"
    "encoding/hex"
    "encoding/pem"
    "errors"

    "github.com/hyperledger/fabric/core/chaincode/shim"
    pb "github.com/hyperledger/fabric/protos/peer"
)

// TokenERC20Chaincode implements a simple ERC20 token on Hyperledger Fabric
type TokenERC20Chaincode struct {
}

// Token represents an ERC20 token
type Token struct {
    Name     string `json:"name"`
    Symbol   string `json:"symbol"`
    Total    uint64 `json:"total"`
    Decimals uint8  `json:"decimals"`
    Balance  map[string]uint64 `json:"balance"`
}

func (t *TokenERC20Chaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil)
}

func pemCertToHex(certPEM string) (string, error) {
    block, _ := pem.Decode([]byte(certPEM))
    if block == nil {
        return "", errors.New("failed to decode PEM block")
    }
    return hex.EncodeToString(block.Bytes), nil
}


func (t *TokenERC20Chaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
    function, args := stub.GetFunctionAndParameters()

    switch function {
    case "mint":
    	return t.mint(stub)
    case "transfer":
        return t.transfer(stub, args)
    case "balanceOf":
        return t.balanceOf(stub)
    case "name":
        return t.name(stub)
    case "symbol":
        return t.symbol(stub)
    case "totalSupply":
        return t.totalSupply(stub)
    case "PrintCreatorAddress":
    	return t.PrintCreatorAddress(stub)    
    }
    return shim.Error("Invalid function name")
}

func (t *TokenERC20Chaincode) mint(stub shim.ChaincodeStubInterface) pb.Response {
    // Initialize the token with name, symbol, total supply, and decimals
    token := Token{
        Name:     "ExampleToken",
        Symbol:   "ETK",
        Total:    1000000,
        Decimals: 18,
        Balance:  make(map[string]uint64),
    }

    // Set total supply to the owner's balance
    creator, err := stub.GetCreator()
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get creator: %s", err))
    }
    
    creatorHex, err := pemCertToHex(string(creator))
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to convert creator to hex: %s", err))
    }

    // Marshal token data and save to ledger
    tokenJSON, err := json.Marshal(token)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to marshal token: %s", err))
    }

    err = stub.PutState("token", tokenJSON)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to put state: %s", err))
    }
    // Set total to blance
    token.Balance[creatorHex] = token.Total
    return shim.Success([]byte(creatorHex))
}


func (t *TokenERC20Chaincode) transfer(stub shim.ChaincodeStubInterface, args []string) pb.Response {
    // Check number of arguments
    if len(args) != 2 {
        return shim.Error("Incorrect number of arguments. Expecting 2: to address and amount")
    }

    // Parse amount
    amount, err := strconv.ParseUint(args[1], 10, 64)
    if err != nil {
        return shim.Error(fmt.Sprintf("Invalid amount: %s", err))
    }

    // Load token state
    tokenJSON, err := stub.GetState("token")
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get token: %s", err))
    }
    var token Token
    err = json.Unmarshal(tokenJSON, &token)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to unmarshal token: %s", err))
    }

    // Deduct amount from sender's balance
    sender, err := stub.GetCreator()
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get creator: %s", err))
    }
    senderBalance := token.Balance[string(sender)]
    if senderBalance < amount {
        return shim.Error("Insufficient balance")
    }
    token.Balance[string(sender)] -= amount

    // Add amount to receiver's balance
    receiver := args[0]
    token.Balance[receiver] += amount

    // Update token state
    tokenJSON, err = json.Marshal(token)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to marshal token: %s", err))
    }
    err = stub.PutState("token", tokenJSON)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to put state: %s", err))
    }

    return shim.Success(nil)
}

func (t *TokenERC20Chaincode) balanceOf(stub shim.ChaincodeStubInterface) pb.Response {
    // Check number of arguments
    creator, err := stub.GetCreator()
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get creator: %s", err))
    }
    
    // Load token state
    tokenJSON, err := stub.GetState("token")
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get token: %s", err))
    }
    var token Token
    err = json.Unmarshal(tokenJSON, &token)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to unmarshal token: %s", err))
    }
    
    creatorHex, err := pemCertToHex(string(creator))
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to convert creator to hex: %s", err))
    }


    // Get balance of specified address
    balance := token.Balance[creatorHex]

    return shim.Success([]byte(fmt.Sprintf("%d", balance)))
}

func (t *TokenERC20Chaincode) name(stub shim.ChaincodeStubInterface) pb.Response {
    // Load token state
    tokenJSON, err := stub.GetState("token")
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get token: %s", err))
    }
    var token Token
    err = json.Unmarshal(tokenJSON, &token)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to unmarshal token: %s", err))
    }

    return shim.Success([]byte(token.Name))
}

func (t *TokenERC20Chaincode) symbol(stub shim.ChaincodeStubInterface) pb.Response {
    // Load token state
    tokenJSON, err := stub.GetState("token")
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get token: %s", err))
    }
    var token Token
    err = json.Unmarshal(tokenJSON, &token)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to unmarshal token: %s", err))
    }

    return shim.Success([]byte(token.Symbol))
}

func (t *TokenERC20Chaincode) totalSupply(stub shim.ChaincodeStubInterface) pb.Response {
    // Load token state
    tokenJSON, err := stub.GetState("token")
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get token: %s", err))
    }
    var token Token
    err = json.Unmarshal(tokenJSON, &token)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to unmarshal token: %s", err))
    }

    return shim.Success([]byte(fmt.Sprintf("%d", token.Total)))
}

func (t *TokenERC20Chaincode) PrintCreatorAddress(stub shim.ChaincodeStubInterface) pb.Response {
    // Lấy thông tin chứng nhận của người tạo transaction
    creator, err := stub.GetCreator()
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get creator: %s", err))
    }
    // In ra địa chỉ
    return shim.Success([]byte(creator))
}

func main() {
    err := shim.Start(new(TokenERC20Chaincode))
    if err != nil {
        fmt.Printf("Error starting TokenERC20Chaincode: %s", err)
    }
}

