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

      await contract.submitTransaction('Initialize', 'TrustPayCoin', 'TPC', '1000', '18');
      //await contract.submitTransaction('transfer', '0a104f72674163636f756e74616e744d535012d3062d2d2d2d2d424547494e2043455254494649434154452d2d2d2d2d0a4d494943526a43434165796741774942416749514a4b315171447169352b687237784d2b7a6e41536944414b42676771686b6a4f50515144416a43426854454c0a4d416b474131554542684d4356564d78457a415242674e5642416754436b4e6862476c6d62334a7561574578466a415542674e564241635444564e68626942470a636d467559326c7a59323878496a416742674e5642416f54475739795a30466a59323931626e5268626e51755a586868625842735a53356a623230784a54416a0a42674e5642414d5448474e684c6d39795a30466a59323931626e5268626e51755a586868625842735a53356a623230774868634e4d6a51774e6a41784d44677a0a4e7a41775768634e4d7a51774e544d774d44677a4e7a4177576a42314d517377435159445651514745774a56557a45544d4245474131554543424d4b513246730a61575a76636d3570595445574d4251474131554542784d4e5532467549455a795957356a61584e6a627a45504d4130474131554543784d47593278705a5735300a4d5367774a6759445651514444423956633256794d554276636d644259324e7664573530595735304c6d56345957317762475575593239744d466b77457759480a4b6f5a497a6a3043415159494b6f5a497a6a304441516344516741456c4831356973635265574a46536e2f36786c53412b4841702b3254685954566a663148680a37395349636a6f386c4472586a646f39697463376145654461497a39424f4a36587130655344364167474b2b4670624933364e4e4d45737744675944565230500a4151482f42415144416765414d41774741315564457745422f7751434d4141774b7759445652306a42435177496f41675132583872457234694a7854323472610a57317a4b76384575713544496c63542b47702b55576d7a5a69444577436759494b6f5a497a6a3045417749445341417752514968414b4374357953765a6c54510a32343768683975396172615a6c52702b536646714a4644744b424b764268645a41694169704c546763506652636e434877356572544b566b436634307a6a71330a7362656451544a77616e524243773d3d0a2d2d2d2d2d454e442043455254494649434154452d2d2d2d2d0a', '10');
      console.log('Transaction has been submitted');

      // Disconnect from the gateway.
      await gateway.disconnect();

  } catch (error) {
      console.error(`Failed to submit transaction: ${error}`);
      process.exit(1);
  }
}

main();
