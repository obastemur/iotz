// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');

exports.build = function mbedBuild(config, runCmd, command) {
  var target_board = config.target;

  if (command == "container_init") {
    return "";
  } else if (command == "init") {
    var libs = `mbed new . && mbed target ${target_board} && mbed toolchain GCC_ARM`;
    if (config.libs) {
      config.libs.forEach(function(lib) {
        if (lib) {
          if (lib.target.indexOf(lib.name) == -1) {
            console.error(" - ", colors.red('error :'), "library name is case sensitive.");
            console.error("   ", `${lib.name} should match the name in ${lib.target}`);
            process.exit(1);
          }
          libs += ` && rm -rf ${lib.name} && mbed add ${lib.target}`;
        }
      });
    }
    libs += " && find . -name '*.lib' -exec cat {} \\; | while read line; do mbed add \\$line 2>/dev/null || true && true ; done";

    return exports.build(config, runCmd, 'clean') + " && " + libs;
  } else if (command == "clean") {
    return "rm -rf BUILD/ .mbed mbed/ mbed-os/ mbed_settings.py*"
  } else {
    return "mbed compile"
  }
} // mbedBuild