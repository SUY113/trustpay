// login.js

'use strict';

const readline = require('readline');
const enrollAdmin = require('./enrollAdmin');
const registerUser = require('./registerUser');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function login() {
    try {
        rl.question('Enter your username: ', async (userName) => {
            rl.question('Enter your organization: ', async (orgName) => {
                rl.question('Are you logging in as admin? (yes/no): ', async (isAdmin) => {
                    if (isAdmin.toLowerCase() === 'yes') {
                        // Check if admin identity exists
                        if (!await enrollAdmin.adminExists()) {
                            await enrollAdmin.enrollAdmin();
                        }
                        console.log('Successfully logged in as admin.');
                    } else {
                        // Check if user identity exists
                        if (!await registerUser.userExists(userName, orgName)) {
                            console.log(`User "${userName}" in organization "${orgName}" does not exist. Registering user...`);
                            await registerUser.registerUser(userName, orgName);
                        }
                        console.log(`Successfully logged in as user "${userName}".`);
                    }
                    rl.close();
                });
            });
        });
    } catch (error) {
        console.error(`Failed to login: ${error}`);
        rl.close();
    }
}

login();
