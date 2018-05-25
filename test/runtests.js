#!/usr/bin/env node

// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const fs = require('fs')
const path = require('path')
const { exec, execSync } = require('child_process');
const colors = require('colors/safe');

const isFolder = dir => fs.lstatSync(dir).isDirectory();
const getTests = function (srcPath) {
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
var lastTestStart = Date.now();
var testFinished = false;
var currentTest;

function applyChanges(txt) {
    var pathsep = path.sep;
    txt = txt.replace(/\$\{UTILS_RUN\.JS\}/g, `node ..${pathsep}utils${pathsep}run.js`);

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

  var subProcess = exec(`cd ${test.path} && ${txt}`);

  var dataLine = "";
  var stdoutput = function(data) {
    dataLine += data;
    if (dataLine[dataLine.length - 1] == '\n') {
      console.log(dataLine);
      dataLine = "";
    }
  };

//   subProcess.stdout.on('data', stdoutput);
  subProcess.stderr.on('data', stdoutput);

  subProcess.on('exit', function(errorCode) {
    if (errorCode) {
        totals.fail++;
        console.log(" -", colors.red('failed'), currentTest.name)
    } else {
        totals.success++;
        console.log(" -", colors.green('pass'), currentTest.name)
    }
    runNextTest();
  });
}

function runNextTest() {
    if (tests.length > 0) {
        currentTest = tests.pop();
        runTest(currentTest);
    } else {
        testFinished = true;
    }
    lastTestStart = Date.now();
}

console.log(' -', 'this will take a while...\n');
execSync('docker pull azureiot/iotc', function(error) {
    if (error) {
        console.error(color.red('do you have Docker installed?'));
        process.exit(1);
    }
});

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
