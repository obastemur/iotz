// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------
"use strict"

const colors = require('colors/safe');
const path = require('path');
const fs = require('fs');

exports.detectProject = function(compile_path, runCmd, command) {
  return false;
}

exports.selfCall = function(config, runCmd, command, compile_path) {
  return exports.buildCommands(config, runCmd, "compile", compile_path).run;
};

exports.createExtension = function() {
  return {
    run : '',
    callback: null
  };
};

exports.buildCommands = function raspberryBuild(config, runCmd, command, compile_path, mount_path) {
  var callback = null;
  var runString = "";

  if (command == 'init') {
    // noop
  } else if (command == 'localFolderContainerConstructer') {
    // noop
  } else if (command == 'clean') {
    runString = "make clean"
  } else if (command == 'compile') {
    runString = "make " + (runCmd != -1 ? runCmd : "")
  } else if (command == 'export') {
    // noop
    process.exit(0);
  } else {
    console.error(" -", colors.red("error :"),
              "Unknown command", command);
    process.exit(1);
  }

  return {
    run: runString,
    callback: callback
  };
}

exports.createProject = function createProject(compile_path, runCmd) {
  var args = typeof runCmd === 'string' ? runCmd.split(' ') : [];

  var projectName;
  if (args.length) {
    projectName = args[0];
  }

  var target_folder;
  if (projectName) {
    target_folder = path.join(compile_path, projectName);
    try {
      fs.mkdirSync(target_folder);
    } catch(e) {
      if (!fs.existsSync(target_folder)) {
        console.error(" -", colors.red("error:"), "cant't create folder", projectName);
        process.exit(1);
      }
    }
  } else {
    target_folder = compile_path;
    projectName = "sampleApplication"
  }

  var example = `
// iotz
// ${projectName}.cpp

#include <stdio.h>

int main()
{
  printf("hello world!\\r\\n");
  return 0;
}
`;

  var config = `
{
  "name":"${projectName}",
  "toolchain":"default"
}
`;

  var makefile = `
# iotz - ${projectName} makefile

CC_COMPILER  = gcc
CXX_COMPILER = g++

C_FLAGS = -Os

${projectName}.o: ${projectName}.cpp
	$(CXX_COMPILER) $(CFLAGS) ${projectName}.cpp -o ${projectName}.o && echo '${projectName}.o is ready'
clean:
	rm ${projectName}.o
`;

  fs.writeFileSync(path.join(target_folder, `${projectName}.cpp`), example);
  fs.writeFileSync(path.join(target_folder, `iotz.json`), config);
  fs.writeFileSync(path.join(target_folder, `Makefile`), makefile);
  console.log(" -", colors.green('done!'));
};