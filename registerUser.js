/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { FileSystemWallet, X509WalletMixin } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Nhận tên người dùng và tổ chức từ đối số dòng lệnh
        const userName = process.argv[2];
        const orgName = process.argv[3];

        // Kiểm tra xem người dùng và tổ chức đã được cung cấp hay chưa
        if (!userName || !orgName) {
            console.log('Please provide the username and organization.');
            return;
        }

        // Xây dựng đường dẫn tới thư mục chứa tài liệu mật mã của người dùng
        const cryptoConfigPath = path.resolve(__dirname, '..', '..', 'first-network', 'crypto-config', 'peerOrganizations', `${orgName}.example.com`, 'users', `${userName}@${orgName}.example.com`, 'msp');

        // Kiểm tra xem thư mục của người dùng tồn tại hay không
        if (!fs.existsSync(cryptoConfigPath)) {
            console.log(`User "${userName}" in organization "${orgName}" does not exist.`);
            return;
        }

        // Đọc chứng chỉ và khóa riêng tư của người dùng
        const certPath = path.join(cryptoConfigPath, 'signcerts', `${userName}@${orgName}.example.com-cert.pem`);
        const keyPath = path.join(cryptoConfigPath, 'keystore', fs.readdirSync(path.join(cryptoConfigPath, 'keystore'))[0]);
        const cert = fs.readFileSync(certPath).toString();
        const key = fs.readFileSync(keyPath).toString();

        // Tạo ví (wallet) và nhập danh tính của người dùng vào ví
        const walletPath = path.join(process.cwd() ,'wallet', `${orgName}`);
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Kiểm tra xem danh tính của người dùng đã tồn tại trong ví hay chưa
        const userExists = await wallet.exists(userName);
        if (userExists) {
            console.log(`An identity for the user "${userName}" already exists in the wallet`);
            return;
        }

        // Tạo danh tính X.509 cho người dùng và nhập vào ví
        const userIdentity = X509WalletMixin.createIdentity(`${orgName}MSP`, cert, key);
        await wallet.import(userName, userIdentity);
        console.log(`Successfully imported user "${userName}" into the wallet`);

    } catch (error) {
        console.error(`Failed to import user "${userName}": ${error}`);
        process.exit(1);
    }
}

main();

