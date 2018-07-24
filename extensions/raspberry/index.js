// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const path = require('path');
const fs = require('fs');

exports.detectProject = function(compile_path, runCmd, command) {
  var detected = null;

  if (!detected && command == "raspberry") {
    detected = {
      "toolchain": "raspberry"
    };
  }

  return detected;
}

exports.selfCall = function(config, runCmd, command, compile_path) {
  return exports.buildCommands(config, runCmd, "compile", compile_path).run;
};

exports.createExtension = function() {
  return `
  RUN echo -e " - installing raspberry pi tools"
  WORKDIR /tools
  RUN wget https://github.com/raspberrypi/tools/archive/5caa7046982f0539cf5380f94da04b31129ed521.zip && \
  unzip -o -q 5caa7046982f0539cf5380f94da04b31129ed521.zip && \
  mv tools-5caa7046982f0539cf5380f94da04b31129ed521 rpitools && rm 5caa7046982f0539cf5380f94da04b31129ed521.zip
  `;
};

exports.buildCommands = function raspberryBuild(config, runCmd, command, compile_path) {
  var callback = null;
  var runString = "";

  if (command == 'init') {
    // noop
  } else if (command == 'container_init') {
    // noop
  } else if (command == 'clean') {
    runString = "rm -rf BUILD/";
  } else if (command == 'compile') {
    console.log(" - compiler tools are available under", colors.green('/tools/rpitools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/'));
    runString = "make --version && cmake --version && /tools/rpitools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-g++ -v";
  } else if (command == 'export') {
    console.error(" -", colors.red("error :"),
`export from a raspberry pi project is not supported.
   Try '${colors.yellow('iotz create raspberry hello-world')}' for a sample hello-world Makefile`);
    process.exit(1);
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
  var args = runCmd.split(' ');

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
  "toolchain":"raspberry"
}
`;

  var makefile = `
# iotz - ${projectName} makefile

CC_COMPILER  = /tools/rpitools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-gcc
CXX_COMPILER = /tools/rpitools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-g++

C_FLAGS = -Os -fPIC

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