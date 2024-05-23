/*
 * SPDX-License-Identifier: Apache-2.0
 */
 
'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');


async function main() {
  try {
       
      const userName = process.argv[2];
      const orgName = process.argv[3]; 
      if (!userName || !orgName) {
          console.log('Please provide the username and organization.');
          return;
        }
      const ccpPath = path.resolve(__dirname, '..', '..', 'first-network',  `connection-org${orgName}.json`);    
      const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
      const ccp = JSON.parse(ccpJSON);    
      // Create a new file system based wallet for managing identities.
      const walletPath = path.join(process.cwd(), 'wallet', `${orgName}`);
      const wallet = new FileSystemWallet(walletPath);
      console.log(`Wallet path: ${walletPath}`);

      // Check to see if we've already enrolled the user.
      const userExists = await wallet.exists(userName);
      if (!userExists) {
          console.log(`An identity for the user "${userName}" does not exist in the wallet`);
          console.log('Run the registerUser.js application before retrying');
          return;
      }

      // Create a new gateway for connecting to our peer node.
      const gateway = new Gateway();
      await gateway.connect(ccp, { wallet, identity: `${userName}`, discovery: { enabled: true, asLocalhost: true } });

      // Get the network (channel) our contract is deployed to.
      const network = await gateway.getNetwork('staffaccountant');

      // Get the contract from the network.
      const contract = network.getContract('database');

      const result = await contract.evaluateTransaction('queryAll');
      console.log(`Transaction has been evaluated, result is: ${result.toString()}`);

      // Disconnect from the gateway.
      await gateway.disconnect();

  } catch (error) {
      console.error(`Failed to submit transaction: ${error}`);
      process.exit(1);
  }
}

main();
