// server.js
'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { FileSystemWallet, X509WalletMixin, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors()); // Thêm dòng này
app.use(bodyParser.json());

app.post('/enroll-admin', async (req, res) => {
    const orgName = req.body.orgName;
    
    try {
        const cryptoConfigPath = path.resolve(__dirname, '..', '..', 'first-network', 'crypto-config', 'peerOrganizations', `org${orgName}.example.com`, 'users', `Admin@org${orgName}.example.com`, 'msp');
        const certPath = path.join(cryptoConfigPath, 'signcerts', `Admin@org${orgName}.example.com-cert.pem`);
        const keyPath = path.join(cryptoConfigPath, 'keystore', fs.readdirSync(path.join(cryptoConfigPath, 'keystore'))[0]);
        const cert = fs.readFileSync(certPath).toString();
        const key = fs.readFileSync(keyPath).toString();
        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const adminExists = await wallet.exists('Admin');
        if (adminExists) {
            return res.status(400).json({ error: 'An identity for the admin user "Admin" already exists in the wallet' });
        }

        const identity = X509WalletMixin.createIdentity(`Org${orgName}MSP`, cert, key);
        identity.roles = ['Admin'];
        await wallet.import('Admin', identity);
        
        res.status(200).json({ message: 'Successfully imported admin user "Admin" into the wallet' });
    } catch (error) {
        console.error(`Failed to import admin user "Admin": ${error}`);
        res.status(500).json({ error: `Failed to import admin user "Admin": ${error.message}` });
    }
});

app.post('/register-user', async(req, res)=> {
    const userName = req.body.userName;
    const orgName = req.body.orgName;

    try {
        const cryptoConfigPath = path.resolve(__dirname, '..', '..', 'first-network', 'crypto-config', 'peerOrganizations', `org${orgName}.example.com`, 'users', `${userName}@org${orgName}.example.com`, 'msp');
        
        if (!fs.existsSync(cryptoConfigPath)) {
            return res.status(400).json({ error: `User "${userName}" in organization "org${orgName}" does not exist` });
        }

        const certPath = path.join(cryptoConfigPath, 'signcerts', `${userName}@org${orgName}.example.com-cert.pem`);
        const keyPath = path.join(cryptoConfigPath, 'keystore', fs.readdirSync(path.join(cryptoConfigPath, 'keystore'))[0]);
        const cert = fs.readFileSync(certPath).toString();
        const key = fs.readFileSync(keyPath).toString();
        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(userName);
        if (userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" already exists in the wallet` });
        }
        
        const userIdentity = X509WalletMixin.createIdentity(`Org${orgName}MSP`, cert, key);
        await wallet.import(userName, userIdentity);

        res.status(200).json({ message: `Successfully imported user "${userName}" into the wallet` });
    } catch (error) {
        console.error(`Failed to import user "${userName}": ${error}`);
        res.status(500).json({ error: `Failed to import user "${userName}": ${error.message}` });
    }
});


app.post('/login', async (req, res) => {
    const { userName, password, orgName } = req.body;

    try {
        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet` });
        }

        const userIdentity = await wallet.export(userName);
        const userCertificate = userIdentity.certificate.replace(/\n/g, '');
        const beginIndex = userCertificate.indexOf('-----BEGIN CERTIFICATE-----') + '-----BEGIN CERTIFICATE-----'.length;
        const endIndex = userCertificate.indexOf('-----END CERTIFICATE-----');
        const userCertificatePw = userCertificate.substring(beginIndex, endIndex);
        if (userCertificatePw !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Add any additional authentication success logic here (e.g., token generation)
        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error(`Failed to login user "${userName}": ${error}`);
        res.status(500).json({ error: `Failed to login user "${userName}": ${error.message}` });
    }
});
//DATABASE
app.post('/input-info', async (req, res) => {
    const { userName, orgName, name, age, ethAddress, channel } = req.body;

    if (!userName || !orgName || !name || !age || !ethAddress) {
        return res.status(400).json({ error: 'Please provide all required fields: userName, orgName, name, age, ethAddress' });
    }

    try {
        const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', `connection-org${orgName}.json`);
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);

        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet. Run the registerUser.js application before retrying` });
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: `${userName}`, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork(channel);
        const contract = network.getContract('database');

        await contract.submitTransaction('initPerson', `Emp${userName}`, `${name}`, `${age}`, `${orgName}`, `${ethAddress}`);
        console.log('Transaction has been submitted');

        await gateway.disconnect();

        res.status(200).json({ message: 'Transaction has been submitted successfully' });
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({ error: `Failed to submit transaction: ${error.message}` });
    }
});

app.post('/update-info', async (req, res) => {
    const { userName, orgName, name, age, ethAddress, channel } = req.body;

    if (!userName || !orgName || !name || !age || !ethAddress) {
        return res.status(400).json({ error: 'Please provide all required fields: userName, orgName, name, age, ethAddress' });
    }

    try {
        const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', `connection-org${orgName}.json`);
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);

        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet. Run the registerUser.js application before retrying` });
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: `${userName}`, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork(channel);
        const contract = network.getContract('database');

        await contract.submitTransaction('updatePerson', `Emp${userName}`, `${age}`, `${ethAddress}`);
        console.log('Transaction has been submitted');

        await gateway.disconnect();

        res.status(200).json({ message: 'Transaction has been submitted successfully' });
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({ error: `Failed to submit transaction: ${error.message}` });
    }
});

app.post('/query-user', async (req, res) => {
    const userName = req.body.userName;
    const orgName = req.body.orgName;
    const channel = req.body.channel;

    try {
        const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', `connection-org${orgName}.json`);
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet` });
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userName, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork(channel);
        const contract = network.getContract('database');

        const result = await contract.evaluateTransaction('queryById', `Emp${userName}`);
        console.log(`Transaction has been evaluated, result is: ${result.toString()}`);

        await gateway.disconnect();

        res.status(200).json({ result: result.toString() });
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({ error: `Failed to submit transaction: ${error.message}` });
    }
});

//TOKENERC20.
app.post('/token-mint', async (req, res) => {
    const userName = req.body.userName;
    const orgName = req.body.orgName;
    const amount = req.body.amount;
    //const channel = req.body.channel;

    try {
        const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', `connection-org${orgName}.json`);
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet` });
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userName, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork('staffaccountant');
        const contract = network.getContract('token_erc20');

        await contract.submitTransaction('Initialize', 'TrustPayCoin', 'TPC', `0`, '18');
        await contract.submitTransaction('Mint', `${amount}`);
        console.log('Transaction has been submitted');

        await gateway.disconnect();

        res.status(200).json({ message: 'Transaction has been submitted successfully' });
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({ error: `Failed to submit transaction: ${error.message}` });
    }
})

app.post("/token-transfer", async (req, res) => {
    const userName = req.body.userName;
    const orgName = req.body.orgName;
    const receive_address = req.body.receive_address;
    const amount = req.body.amount;
  
    //const channel = req.body.channel;
  
    try {
      const ccpPath = path.resolve(
        __dirname,
        "..",
        "..",
        "first-network",
        `connection-org${orgName}.json`
      );
      const ccpJSON = fs.readFileSync(ccpPath, "utf8");
      const ccp = JSON.parse(ccpJSON);
      const walletPath = path.join(process.cwd(), "wallet", `${orgName}`);
      const wallet = new FileSystemWallet(walletPath);
  
      const userExists = await wallet.exists(userName);
      if (!userExists) {
        return res
          .status(400)
          .json({
            error: `An identity for the user "${userName}" does not exist in the wallet`,
          });
      }
  
      const gateway = new Gateway();
      await gateway.connect(ccp, {
        wallet,
        identity: userName,
        discovery: { enabled: true, asLocalhost: true },
      });
  
      const network = await gateway.getNetwork("staffaccountant");
      const contract = network.getContract("token_erc20");
  
      await contract.submitTransaction(
        "transfer",
        `${receive_address}`,
        `${amount}`
      );
      console.log("Transaction has been submitted");
  
      await gateway.disconnect();
  
      res
        .status(200)
        .json({ message: "Transaction has been submitted successfully" });
    } catch (error) {
      console.error(`Failed to submit transaction: ${error}`);
      res
        .status(500)
        .json({ error: `Failed to submit transaction: ${error.message}` });
    }
  });
  
  app.post("/query-balance", async (req, res) => {
    const userName = req.body.userName;
    const orgName = req.body.orgName;
    //const channel = req.body.channel;
  
    try {
      const ccpPath = path.resolve(
        __dirname,
        "..",
        "..",
        "first-network",
        `connection-org${orgName}.json`
      );
      const ccpJSON = fs.readFileSync(ccpPath, "utf8");
      const ccp = JSON.parse(ccpJSON);
      const walletPath = path.join(process.cwd(), "wallet", `${orgName}`);
      const wallet = new FileSystemWallet(walletPath);
  
      const userExists = await wallet.exists(userName);
      if (!userExists) {
        return res
          .status(400)
          .json({
            error: `An identity for the user "${userName}" does not exist in the wallet`,
          });
      }
  
      const gateway = new Gateway();
      await gateway.connect(ccp, {
        wallet,
        identity: userName,
        discovery: { enabled: true, asLocalhost: true },
      });
  
      const network = await gateway.getNetwork("staffaccountant");
      const contract = network.getContract("token_erc20");
  
      const resultBalance = await contract.submitTransaction(
        "ClientAccountBalance"
      );
      console.log(
        `Transaction has been evaluated, result is: ${resultBalance.toString()}`
      );
  
      await gateway.disconnect();
  
      res.status(200).json({ resultBalance: resultBalance.toString() });
    } catch (error) {
      console.error(`Failed to submit transaction: ${error}`);
      res
        .status(500)
        .json({ error: `Failed to submit transaction: ${error.message}` });
    }
  });
  
  app.post("/query-ID", async (req, res) => {
    const userName = req.body.userName;
    const orgName = req.body.orgName;
    //const channel = req.body.channel;
  
    try {
      const ccpPath = path.resolve(
        __dirname,
        "..",
        "..",
        "first-network",
        `connection-org${orgName}.json`
      );
      const ccpJSON = fs.readFileSync(ccpPath, "utf8");
      const ccp = JSON.parse(ccpJSON);
      const walletPath = path.join(process.cwd(), "wallet", `${orgName}`);
      const wallet = new FileSystemWallet(walletPath);
  
      const userExists = await wallet.exists(userName);
      if (!userExists) {
        return res
          .status(400)
          .json({
            error: `An identity for the user "${userName}" does not exist in the wallet`,
          });
      }
  
      const gateway = new Gateway();
      await gateway.connect(ccp, {
        wallet,
        identity: userName,
        discovery: { enabled: true, asLocalhost: true },
      });
  
      const network = await gateway.getNetwork("staffaccountant");
      const contract = network.getContract("token_erc20");
  
      const resultID = await contract.submitTransaction("ClientAccountID");
      console.log(
        `Transaction has been evaluated, result is: ${resultID.toString()}`
      );
  
      await gateway.disconnect();
  
      res.status(200).json({ resultID: resultID.toString() });
    } catch (error) {
      console.error(`Failed to submit transaction: ${error}`);
      res
        .status(500)
        .json({ error: `Failed to submit transaction: ${error.message}` });
    }
  });
  

//MULTISIGN
app.post('/submit-request', async (req, res) => {
    const { userName, orgName, requestID, targetAccount } = req.body;
  
    try {
        const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', `connection-org${orgName}.json`);
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet` });
        }
  
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userName, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork('staffstaff');
        const contract = network.getContract('multisign');
        await contract.submitTransaction('submitRequest', requestID, targetAccount);
        console.log('Transaction has been submitted');

        await gateway.disconnect();
  
        res.status(200).json({ message: 'Transaction has been submitted successfully' });
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({ error: `Failed to submit transaction: ${error.message}` });
    }
  });
  
app.post('/respond-request', async (req, res) => {
    const { userName, orgName, requestID, response } = req.body;
  
    try {
        const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', `connection-org${orgName}.json`);
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet` });
        }
  
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userName, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork('staffstaff');
        const contract = network.getContract('multisign');
  
        await contract.submitTransaction('respondToRequest', requestID, response);
  
        await gateway.disconnect();
  
        res.status(200).json({ message: 'Transaction has been submitted successfully' });

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({ error: `Failed to submit transaction: ${error.message}` });
    }
  });
  
app.post('/evaluate-request', async (req, res) => {
    const {userName, orgName, requestID } = req.body;
  
    try {
        const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', `connection-org${orgName}.json`);
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet` });
        }
  
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userName, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork('staffstaff');
        const contract = network.getContract('multisign');
  
        const result = await contract.evaluateTransaction('evaluateRequest', requestID);
  
        await gateway.disconnect();
  
        res.status(200).json({ result: result.toString() });
    } catch (error) {
        res.status(500).json({ error: `Failed to evaluate request: ${error}` });
    }
  });
  
app.post('/finalize-request', async (req, res) => {
    const {userName, orgName, requestID } = req.body;
  
    try {
        const ccpPath = path.resolve(__dirname, '..', '..', 'first-network', `connection-org${orgName}.json`);
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet` });
        }
  
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userName, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork('staffstaff');
        const contract = network.getContract('multisign');
  
        const result = await contract.submitTransaction('finalizeRequest', requestID);
  
        await gateway.disconnect();
  
        res.status(200).json({ result: result.toString() });
    } catch (error) {
        res.status(500).json({ error: `Failed to finalize request: ${error}` });
    }
  });
  

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

