#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

var home = process.cwd();
if (fs.existsSync(path.join(home, 'Dockerfile'))) {
    console.error(' - error: garbage left behind. (Dockerfile)');
    process.exit(1);
}

var isWin = process.platform === "win32";
var batchFile = path.join(home, '_iotz__batch_' + (isWin ? '.cmd' : '.sh'));

if (fs.existsSync(batchFile)) {
    console.error(' - error: garbage left behind. (' + batchFile + ')');
    process.exit(1);
}

console.log('pass');