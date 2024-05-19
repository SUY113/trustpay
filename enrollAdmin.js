'use strict';

const { FileSystemWallet, X509WalletMixin } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
      	const orgName = process.argv[2];
        // Đường dẫn tới thư mục chứa tài liệu mật mã của admin được tạo bởi cryptogen
        const cryptoConfigPath = path.resolve(__dirname, '..', '..', 'first-network', 'crypto-config', 'peerOrganizations', `${orgName}.example.com`, 'users', `Admin@${orgName}.example.com`, 'msp');
        
        // Đọc chứng chỉ và khóa riêng tư của admin
        const certPath = path.join(cryptoConfigPath, 'signcerts', `Admin@${orgName}.example.com-cert.pem`);
        const keyPath = path.join(cryptoConfigPath, 'keystore', fs.readdirSync(path.join(cryptoConfigPath, 'keystore'))[0]);
        const cert = fs.readFileSync(certPath).toString();
        const key = fs.readFileSync(keyPath).toString();

        // Tạo ví (wallet) và nhập danh tính của admin vào ví
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Kiểm tra xem danh tính admin đã tồn tại trong ví hay chưa
        const adminExists = await wallet.exists('Admin');
        if (adminExists) {
            console.log('An identity for the admin user "Admin" already exists in the wallet');
            return;
        }

        // Tạo danh tính X.509 cho admin và nhập vào ví
        const identity = X509WalletMixin.createIdentity(`${orgName}MSP`, cert, key);
        identity.roles = ['Admin']; 
        await wallet.import('Admin', identity);
        console.log('Successfully imported admin user "Admin" into the wallet');
        
    } catch (error) {
        console.error(`Failed to import admin user "Admin": ${error}`);
        process.exit(1);
    }
}

main();

