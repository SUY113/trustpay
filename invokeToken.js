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
      const contract = network.getContract('token_erc20');

      //await contract.submitTransaction('Initialize', 'TrustPayCoin', 'TPC', '1000', '18');
      await contract.submitTransaction('transfer', '0a0b4f726753746166664d535012ba062d2d2d2d2d424547494e2043455254494649434154452d2d2d2d2d0a4d4949434e6a434341643267417749424167495241496f514537714a774d764c656463317958336756465177436759494b6f5a497a6a304541774977657a454c0a4d416b474131554542684d4356564d78457a415242674e5642416754436b4e6862476c6d62334a7561574578466a415542674e564241635444564e68626942470a636d467559326c7a593238784854416242674e5642416f54464739795a314e3059575a6d4c6d56345957317762475575593239744d53417748675944565151440a4578646a59533576636d64546447466d5a69356c654746746347786c4c6d4e7662544165467730794e4441324d444d774e7a4d334d4442614677307a4e4441320a4d4445774e7a4d334d4442614d484178437a414a42674e5642415954416c56544d524d77455159445651514945777044595778705a6d3979626d6c684d5259770a46415944565151484577315459573467526e4a68626d4e7063324e764d513877445159445651514c45775a6a62476c6c626e5178497a416842674e5642414d4d0a476c567a5a584935514739795a314e3059575a6d4c6d56345957317762475575593239744d466b77457759484b6f5a497a6a3043415159494b6f5a497a6a30440a4151634451674145544754384531677649586548634a68486d416f33314b544d59672b7a734e6657344564424765566e5a6143594c685a7733636b474d5436420a3935713231496a34596173577454377172616a53775953314a69496d64614e4e4d45737744675944565230504151482f42415144416765414d417747413155640a457745422f7751434d4141774b7759445652306a42435177496f41673758725a6c70684a68692f44686379436c756174653578703652786b7345595476656b630a4a65796f787a4177436759494b6f5a497a6a304541774944527741775241496755556b4452614f5a79585a6455764d782b44794379794c734272766567575a530a717659732f4c474e786559434947596673496a526f4369565a5779364a35634f6939494d6641436b74694d6864543576486b7177434c34740a2d2d2d2d2d454e442043455254494649434154452d2d2d2d2d0a', '10');
      console.log('Transaction has been submitted');

      // Disconnect from the gateway.
      await gateway.disconnect();

  } catch (error) {
      console.error(`Failed to submit transaction: ${error}`);
      process.exit(1);
  }
}

main();
