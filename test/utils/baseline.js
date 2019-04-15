#!/usr/bin/env node

const { execSync } = require('child_process');
const colors = require('colors');
const path = require('path');
const fs = require('fs');

// baseline.js <expects_fail 0/1> "<command to run>"
var expectsFail = process.argv[2] == '1';

try {
    execSync(process.argv[3] + " > test_baseline", {stdio:[0, 1, 2]});
} catch(e) {
  if (!expectsFail) {
    console.error(" -", colors.bold("error:"), "command", "'" + process.argv[3] + "'", "has failed.");
    console.error(e.message);
    process.exit(1);
  }
}

var home = process.cwd();
var baseline = fs.readFileSync(path.join(home, "baseline")) + "";
var test_baseline = fs.readFileSync(path.join(home, "test_baseline")) + "";

if (baseline !== test_baseline) {
  console.error(" -", colors.bold("error:"), "baseline file doesn't match with test_baseline.");
  process.exit(1);
}

if (fs.existsSync(path.join(home, 'Dockerfile'))) {
  console.error(" -", colors.bold("error:"), "garbage left behind. (Dockerfile)");
  process.exit(1);
}

var isWin = process.platform === "win32";
var batchFile = path.join(home, '_iotz__batch_' + (isWin ? '.cmd' : '.sh'));

if (fs.existsSync(batchFile)) {
  console.error(" -", colors.bold("error:"), "garbage left behind. (" + batchFile + ")");
  process.exit(1);
}

console.log('pass');