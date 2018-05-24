#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// run.js <expects_fail 0/1> "<command to run>"
var expectsFail = process.argv[2] == '1';

try {
    execSync(process.argv[3]);
} catch(e) {
    if (!expectsFail) {
        console.error("Command", "'" + process.argv[3] + "'", "has failed.")
        console.error(e.message);
        process.exit(1);
    }
}

console.log('pass');