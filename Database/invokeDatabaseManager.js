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
      const name = process.argv[4];
      const age = process.argv[5];
      const ethaddress = process.argv[6];
      
      
      if (!userName || !orgName) {
          console.log('Please provide the username and organization.');
          return;
        }
      const ccpPath = path.resolve(__dirname, '..', '..', '..', 'first-network',  `connection-org${orgName}.json`);    
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
      const network = await gateway.getNetwork('accountantmanager');

      // Get the contract from the network.
      const contract = network.getContract('database');

      await contract.submitTransaction('initPerson', `Emp${userName}`, `${name}`, `${age}`, `${orgName}`, `${ethaddress}`);
      console.log('Transaction has been submitted');

      // Disconnect from the gateway.
      await gateway.disconnect();

  } catch (error) {
      console.error(`Failed to submit transaction: ${error}`);
      process.exit(1);
  }
}

main();
