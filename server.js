// server.js
'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { FileSystemWallet, X509WalletMixin } = require('fabric-network');
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

app.post('/query-user', async (req, res) => {
    const userName = req.body.userName;
    const orgName = req.body.orgName;
    const channel = req.body.channel;

    try {
        const ccpPath = path.resolve(__dirname, '..', '..', '..', 'first-network', `connection-org${orgName}.json`);
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const walletPath = path.join(process.cwd(), '..', 'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);

        const userExists = await wallet.exists(userName);
        if (!userExists) {
            return res.status(400).json({ error: `An identity for the user "${userName}" does not exist in the wallet` });
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: `${userName}`, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork(`${channel}`);
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

