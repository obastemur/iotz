#!/usr/bin/env node

// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const fs = require('fs')
const path = require('path')
const { exec, execSync } = require('child_process');
const colors = require('colors/safe');
const rimraf = require('rimraf');

const isFolder = dir => fs.lstatSync(dir).isDirectory();
const getTests = function (srcPath) {
  if (process.argv.length > 2) {
    return [{
      path: path.join(__dirname, process.argv[2]),
      name: process.argv[2]
    }];
  }
  var getFolders = dir => fs.readdirSync(dir)
    .map(name => path.join(path.resolve(dir), name)).filter(isFolder);
  var tests = getFolders(srcPath);

  tests.forEach((value, index, array) => array[index] = {
    path: value,
    name: path.basename(value)
  });
  return tests;
};

var totals = {
  fail: 0,
  success: 0
};
var tests = getTests(process.cwd());
var testFinished = false;
var currentTest;

function applyChanges(txt) {
  var pathsep = path.sep;
  txt = txt.replace(/\$\{UTILS_RUN\.JS\}/g, `node ..${pathsep}utils${pathsep}run.js`);
  txt = txt.replace(/\$\{UTILS_BASELINE\.JS\}/g, `node ..${pathsep}utils${pathsep}baseline.js`);

  return txt;
}

function runTest(test) {
  var batchFile = path.join(test.path, 'run.batch');

  if (!fs.existsSync(batchFile)) {
    runNextTest();
    return; // this folder is not a test folder;
  }

  var txt = (fs.readFileSync(batchFile) + "");
  txt = applyChanges(txt)

  console.log(colors.yellow('running'), txt);
  rimraf.sync(test.path);

  try {
    execSync(`git checkout ${test.path} && cd ${test.path} && ${txt}`, {stdio:[0,1,2]});
    totals.success++;
    console.log(" -", colors.green('pass'), currentTest.name)
  } catch(err) {
    totals.fail++;
    console.log(" -", colors.red('failed'), currentTest.name)
    console.error(err.message);
    process.exit(1);
  }
  runNextTest();
}

function runNextTest() {
  if (tests.length > 0) {
    currentTest = tests.pop();
    runTest(currentTest);
  } else {
    testFinished = true;
  }
}

console.log(' -', 'this will take a while...\n');
var prc = exec('docker pull azureiot/iotz 2>&1', function(error) {
  if (error) {
    if ((error + "").indexOf("Client.Timeout exceeded while awaiting headers") > 0) {
      console.error(colors.yellow('Restarting Docker may help to solve this issue'));
    } else {
      console.error(colors.red('have you installed Docker?'));
      if ((error + "").indexOf("Service Unavailable") > 0) {
        console.error("You might have a problem with your network connection as well.\n");
      }
    }
    process.exit(1);
  }

  runNextTest();

  var globInterval = setInterval(function() {
    if (testFinished) {
      clearInterval(globInterval);
      console.log(colors.yellow('\nTest run is finished.\n'));
      console.log(" -", colors.red  ('total failed'), totals.fail)
      console.log(" -", colors.green('total pass'), totals.success)
      console.log(" -", colors.yellow('total'), totals.success + totals.fail)
    }
  });
});

prc.stdout.on('data', function (data) {
  process.stdout.write(data);
});
