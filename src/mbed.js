// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

function checkSource(config) {
  var source = '';
  if (config.hasOwnProperty("mbed_app.json")) {
    var basejson = '';
    var mbedjsonFilePath = path.join(process.cwd(), 'iotc-mbed-deps', 'mbed_app.json');
    if (fs.existsSync(mbedjsonFilePath)) {
      basejson = fs.readFileSync(mbedjsonFilePath) + "";
    }

    var newjson = JSON.stringify(config["mbed_app.json"], 0, 2);
    if (basejson != newjson) {
      // update mbed_app.json
      fs.writeFileSync(mbedjsonFilePath, newjson);
    }
    source = '--app-config iotc-mbed-deps/mbed_app.json';
  }
  return source;
}

exports.build = function mbedBuild(config, runCmd, command) {
  var target_board = config.target;
  var runString = "";
  var callback = null;

  if (command == "container_init") {
    // noop
  } else if (command == "init") {
    if (config.hasOwnProperty("mbed_app.json")) {
      callback = function(config) {
        var mbedjsonFilePath = path.join(process.cwd(), 'iotc-mbed-deps', 'mbed_app.json');
        var newjson = JSON.stringify(config["mbed_app.json"], 0, 2);
        fs.writeFileSync(mbedjsonFilePath, newjson);
      }
    }

    var libs = " && find . -name '*.lib' -exec cat {} \\; | while read line; do mbed add \\$line 2>/dev/null || true && true ; done";
    if (config.deps) {
      config.deps.forEach(function(lib) {
        if (lib) {
          if (!lib.url) {
            console.error(" - ", console.red("error :"),
              "Unknown config ", JSON.stringify(lib, 0, 2));
          } else {
            if (lib.url.indexOf(lib.name) == -1) {
              console.error(" - ", colors.red('error :'), "library name is case sensitive.");
              console.error("   ", `${lib.name} should match the name in ${lib.url}`);
              process.exit(1);
            }
            if (lib.name != 'mbed-os') {
              libs += ` && rm -rf iotc-mbed-deps/${lib.name} && mbed add ${lib.url} iotc-mbed-deps/${lib.name}`;
            } else {
              libs += ` && rm -rf ${lib.name} && mbed add ${lib.url}`;
            }
          }
        }
      });
    }

    var importMbed = "";
    if (libs.indexOf("/mbed-os/#") > 0) {
      importMbed = "--create-only";
    }

    // if project seeks a specific version of MBED, import and use it instead
    libs = `mbed new . ${importMbed} && mbed target ${target_board} && mbed toolchain GCC_ARM` + libs;
    runString = exports.build(config, runCmd, 'clean').run + " && " + libs;
  } else if (command == "clean") {
    runString = "rm -rf iotc-mbed-deps/ BUILD/ .mbed mbed/ mbed-os.lib mbed-os/ mbed_settings.py*"
  } else if (command == 'compile') {
    var source = checkSource(config);
    runString = `mbed compile ${source}`;
  } else if (command == 'export') {
    var source = checkSource(config);
    runString = `mbed export --ide make_gcc_arm ${source}`;
    callback = function(config) {
      var mpath = path.join(process.cwd(), "Makefile");
      if (!fs.existsSync(mpath)) {
        console.error(" - ", colors.red('error'), 'Unable to find Makefile on the current path');
        process.exit(1);
      }
      var source = fs.readFileSync(mpath) + "";
      source = source.replace("CPP     = 'arm-none-eabi-g++'",
        "CPP     = 'arm-none-eabi-g++' '-fdiagnostics-color=always'");
      source = source.replace("C     = 'arm-none-eabi-gcc'",
        "CC     = 'arm-none-eabi-gcc' '-fdiagnostics-color=always'");
      fs.writeFileSync(mpath, source);

      console.log(colors.green("Makefile"), "is ready.\nTry ",
        colors.magenta('iotc run make -j2'));
    }
  } else {
    console.error(" - ", console.red("error :"),
              "Unknown command", command);
    process.exit(1);
  }

  return {
    run: runString,
    callback: callback
  };
} // mbedBuild