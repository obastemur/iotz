#!/usr/bin/env node

// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors  = require('colors/safe');
const fs      = require('fs');
const path    = require('path');
const exec    = require('child_process').exec;
const commons = require('./src/common');

var args = {};
var printHelp = function printHelp(printAll) {
var params = [
    {option: "help", text: "display available options"},
    {option: "version", text: "show version"},
    {option: "update", text: "update base container to latest"},
    {option: "", text: ""}, // placeholder
    {option: "clean", text:"clean up the local container and generated files"},
    {option: "connect <optional args>", text: "mount the container on current path and sync tty"},
    {option: "compile", text: "compile the project on current path (needs iotz.json)"},
    {option: "create <args>",  text: "create an empty project."},
    {option: "init <extension> <optional target>", text:"initialize a project for current path"},
    {option: "export", text: "exports a Makefile"},
    {option: "", text: ""}, // placeholder
    {option: "arduino <args>", text:"run arduino cli with given args"},
    {option: "make <optional args>", text:"run Makefile command"},
    {option: "mbed <args>", text:"run mbed cli with given args"},
    {option: "raspberry", text: "shows make, cmake, and gcc gnuhf versions"},
    {option: "run <cmd>", text: "run a bash command on the target system"}
  ];

  console.log(' ', "usage:", colors.cyan('iotz'), '<cmd>', '[options]\n\n',
              colors.bold(' commands:\n'));

  for (var i in params) {
    var param = params[i];
    if (param.hidden) continue;
    var space = new Buffer(40 - param.option.length);
    space.fill(" ");
    console.log(' ', param.option, space + colors.bold(": "), param.text);
  }

  if (printAll) {
    console.log(`
    ${colors.bold("init && compile:")}
    iotz init && iotz compile

    iotz.json --> {
                    "toolchain": "arduino",
                    "target": "AZ3166:stm32f4:MXCHIP_AZ3166",
                    "filename": "sample.ino"
                  }

    iotz.json --> {
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
      iotz run ls -l
    create:
      iotz create arduino uno
      iotz create raspberry
    make:
      iotz make
    mbed:
      iotz mbed target -S

      iotz init <optional target name>
    arduino:
      iotz arduino --install-boards AZ3166:stm32f4

      iotz init <optional target name>
      - if you haven't configured an iotz.json file.
      use the list from https://aka.ms/iotc-boards
      i.e.
      iotz init uno
    `);
  } else {
    console.log("\n ", colors.bold("need more? try 'iotz help more'\n"));
  }
};

if (process.argv.length < 3) {
  printHelp();
  process.exit(0);
}

args.command = process.argv[2].toLowerCase();
args.getCommand = function() { return args.command.trim(); }

args.get = function(command) {
  var index = 2;
  if (process.argv.length <= index + 1) {
    return -1;
  }

  var str = "";
  for (var i = index + 1; i < process.argv.length; i++) {
    str += process.argv[i] + " ";
  }

  return str.trim();
}

if (args.getCommand() == 'version' || args.getCommand() == '-v') {
  try {
    var version = JSON.parse(fs.readFileSync(__dirname + '/package.json') + "").version;
    console.log("version ", colors.bold(version));
  } catch(e) {
    console.log(" -", colors.bold("error:"), e.message);
  }
  process.exit(0);
}

// verify if docker is installed (TODO: make it better!)
exec(
  'docker -v', function(err, data, stderr){
    if (err) {
      console.error(
          ' -', colors.bold('error:'),
          colors.bold('docker'), 'is required and not found.\n',
          '          visit', colors.bold('https://docs.docker.com/install/'),
          '\n');
      process.exit(1);
    } else {
      start();
    }
  }
);

function start() {
  var compile_path = path.resolve(process.cwd());

  if (args.getCommand() == 'update') {
    console.log(" -", "updating.. (this may take some time)");
    exec('docker pull azureiot/iotz:latest', function(err, data, stderr) {
      if (err) {
        console.log(stderr.replace(/\\n/g, '\n'), '\n', data);
        console.error(' -', colors.bold('error:'), 'update has failed. See the output above.');
        process.exit(1);
      } else {
        console.log(data.replace(/\\n/g, '\n'));
        console.log(colors.bold(' - base container update was succesfull'));
        // update extensions and local package
        require('./extensions/index.js').updateExtensions(compile_path);
      }
    });
    return;
  }

  if (args.getCommand() == 'help' ||
      args.getCommand() == '-h' ||
      args.getCommand() == '-?' ||
      args.getCommand() == '--help') {

    printHelp(args.get(args.getCommand()) == 'more' || args.get(args.getCommand()) == 'all');
    return;
  }

  try {
    commons.runCommand(args, compile_path);
  } catch (e) {
    var message = e + "";
    if (message.indexOf("Bad response from Docker engine") > 0 ||
        message.indexOf("docker deamon is not running") > 0) {
      console.error(" -", colors.bold("error:"), "Docker has not started yet?");
      console.error("   response from Docker: docker deamon is not running");
    } else if (message.indexOf("Client.Timeout exceeded while awaiting headers") > 0) {
      console.error(e.message ? e.message : e);
      console.error(colors.bold('Restarting Docker may help to solve this issue'));
    } else {
      console.error(e.message ? e.message : e);
    }
    process.exit(1);
  }
}