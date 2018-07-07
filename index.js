#!/usr/bin/env node

// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors  = require('colors/safe');
const fs      = require('fs');
const path    = require('path');
const cmd     = require('node-cmd');
const make    = require('./src/common');

var args = {};
var printHelp = function printHelp() {
  console.log("\n  " + colors.cyan("iotc")
    + " - containerized compiler tooling for Arduino, ARM, and ARM mbed");
  console.log(colors.yellow('\t\t\t\t\t\t\t   by Azure-IOT\n'));

var params = [
    {option: "help", text: "display available options"},
    {option: "version", text: "show version"},
    {option: "update", text: "update base container to latest"},
    {option: "", text: ""}, // placeholder
    {option: "init <path>", text:"initialize target toolchain on given path (needs iotc.json)"},
    {option: "compile <path>", text:"compile given path (needs iotc.json)"},
    {option: "clean <path>", text:"clean given path (needs iotc.json)"},
    {option: "arduino <args>", text:"run arduino cli with given args"},
    {option: "mbed <args>", text:"run mbed cli with given args"},
    {option: "run <cmd>", text: "run command on the target system"},
    {option: "export", text: "exports a Makefile"}
  ];

  console.log(' ', "usage:", colors.cyan('iotc'), '<cmd>', '[options]\n\n',
              colors.bold(' commands:\n'));

  for (var i in params) {
    var param = params[i];
    if (param.hidden) continue;
    var space = new Buffer(40 - param.option.length);
    space.fill(" ");
    console.log(' ', param.option, space + colors.bold(": "), param.text);
  }
  console.log(`
  ${colors.bold("init && compile:")}
  iotc init && iotc compile

  iotc.json --> {
                  "toolchain": "arduino",
                  "target": "AZ3166:stm32f4:MXCHIP_AZ3166",
                  "filename": "sample.ino"
                }

  iotc.json --> {
                  "toolchain": "mbed",
                  "target": "nucleo_l476rg",
                  "deps":
                    [
                      {
                        "name": "NDefLib",
                        "url" : "https://developer.mbed.org/teams/ST/code/NDefLib/#31f727872290"
                      }
                    ]
                }

  ${colors.bold("CAUTION:")} 'target' and 'toolchain' names are case sensitive
  more at: https://aka.ms/iotc-boards

  ${colors.bold("OTHER examples")}
  run:
    iotc run ls -l
  make:
    iotc make
  mbed:
    iotc mbed target -S
  arduino:
    iotc arduino --install-boards AZ3166:stm32f4
  `);
};

if (process.argv.length < 3) {
  printHelp();
  process.exit(0);
}

args.command = process.argv[2].toLowerCase();
args.getCommand = function() { return args.command; }

args.get = function(command) {
  var index = 2;
  if (process.argv.length <= index + 1) {
    return -1;
  }

  var str = "";
  for (var i = index + 1; i < process.argv.length; i++) {
    str += process.argv[i] + " ";
  }

  return str;
}

if (args.getCommand() == 'version' || args.getCommand() == '-v') {
  try {
    var version = JSON.parse(fs.readFileSync(__dirname + '/package.json') + "").version;
    console.log("  version ", colors.green(version));
  } catch(e) {
    console.log("  - error : " + e.message);
  }
  process.exit(0);
}

cmd.get(
  'docker -v', function(err, data, stderr){
    if (err) {
      console.error(
          ' - ' + colors.red('error') + ' : '
          + colors.red('docker'), 'is required and not found.\n',
          '          visit', colors.green('https://docs.docker.com/install/'),
          '\n');
      process.exit(1);
    } else {
      builder();
    }
  }
);

function builder() {
  if (args.getCommand() == 'update') {
    cmd.get('docker pull azureiot/iotc:latest',
      function(err, data, stderr) {
        if (err) {
          console.log(stderr.replace(/\\n/g, '\n'), '\n', data);
          console.error(colors.red(' - error: update has failed. See the output above.'))
          process.exit(1);
        } else {
          console.log(data.replace(/\\n/g, '\n'));
          console.log(colors.green(' - update was succesfull'));
        }
      });
    return;
  }

  if (args.getCommand() == 'help' ||
      args.getCommand() == '-h' ||
      args.getCommand() == '--help') {

    printHelp();
    process.exit(0);
    return;
  }

  var compile_path = process.cwd();

  if (args.getCommand() == 'compile') {
    if (process.argv.length > 3) {
      compile_path = process.argv[3];
    }

    var proj_path = path.join(compile_path, "iotc.json");
    if (!fs.existsSync(proj_path)) {
      console.error(' - error:', colors.red('iotc.json file is not found under'), compile_path);
      process.exit(0);
    }
  }
  compile_path = path.resolve(compile_path)
  make.build(args, compile_path);
}