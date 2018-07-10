// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');

exports.detectProject = function(compile_path) {
  return false;
}

exports.directCall = function(config, runCmd, command, compile_path) {
  return exports.build(config, runCmd, "compile", compile_path).run;
};

exports.createExtensions = function() {
  return `
  RUN echo -e " - installing raspberry pi tools"
  WORKDIR /tools
  RUN apt-get install -y g++-arm-linux-gnueabihf gdb-multiarch
  `;
};

exports.build = function raspberryBuild(config, runCmd, command, compile_path) {
  var callback = null;
  var runString = "";

  if (command == 'init') {
    // noop
  } else if (command == 'container_init') {
    // noop
  } else if (command == 'clean') {
    runString = "rm -rf BUILD/";
    callback = function(config) {
      var ino = fs.statSync(compile_path).ino;
      var container_name = "aiot_iotz_" + ino;
      try {
        // clean up the previously stopped instance
        execSync(`docker image rm -f ${container_name} 2>&1`);
      } catch(e) { }
    };
  } else if (command == 'compile') { // build
    console.log(colors.green('arm-linux-gnueabihf-g++'), 'is on the path.')
    runString = "make --version && cmake --version && arm-linux-gnueabihf-g++ -v";
  } else if (command == 'export') {
    console.error(" -", console.red("error :"),
              "export from raspberry projects is not supported");
    process.exit(1);
  } else {
    console.error(" -", console.red("error :"),
              "Unknown command", command);
    process.exit(1);
  }

  return {
    run: runString,
    callback: callback
  };
}