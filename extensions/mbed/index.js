// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const fs = require('fs');
const path = require('path');

exports.detectProject = function(compile_path, runCmd, command) {
  var detected = null;
  if (fs.existsSync(path.join(compile_path, '.mbed')) || fs.existsSync(path.join(compile_path, 'mbed_app.json')) ||
    fs.existsSync(path.join(compile_path, 'mbed-os.lib'))) {
    detected = {
      "toolchain": "mbed"
    };
  }

  if (!detected && command == "mbed") {
    detected = {
      "toolchain": "mbed"
    };
  }

  return detected;
}

exports.directCall = function(config, runCmd, command, compile_path) {
  if (runCmd !== -1) {
    runCmd = command + " " + runCmd;
  } else {
    runCmd = command;
  }
  return runCmd;
};

exports.createExtensions = function() {
  return `
  RUN echo -e " - installing ARM mbed tools"

  RUN pip install mbed-cli \
    && mkdir XXX && cd XXX && echo "#include <mbed.h>\\nint main(){return 0;}" > main.cpp \
    && mbed new . && mbed compile -t GCC_ARM -m NUCLEO_L476RG \
    && cd .. && rm -rf XXX
  `;
};

var checkSource = function checkSource(config) {
  var source = '';
  if (config.hasOwnProperty("mbed_app.json")) {
    var basejson = '';
    var mbedjsonFilePath = path.join(process.cwd(), 'iotz-mbed-deps', 'mbed_app.json');
    if (fs.existsSync(mbedjsonFilePath)) {
      basejson = fs.readFileSync(mbedjsonFilePath) + "";
    }

    var newjson = JSON.stringify(config["mbed_app.json"], 0, 2);
    if (basejson != newjson) {
      // update mbed_app.json
      fs.writeFileSync(mbedjsonFilePath, newjson);
    }
    source = '--app-config iotz-mbed-deps/mbed_app.json';
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
    if (typeof runCmd === 'string' && runCmd.length) {
      // don't let setting target board from multiple places
      if (target_board) {
        console.error(" -", colors.magenta('warning:'), 'updating the target board definition on iotz.json file.');
      }

      config.target = runCmd;
      target_board = config.target;
      try {
        fs.writeFileSync(path.join(compile_path, 'iotz.json'), JSON.stringify(config, 0, 2));
        console.log(' -', 'successfully updated target on iotz.json file');
      } catch (e) {
        console.error(' -', colors.red('error:'), "couldn't update iotz.json with the target board.");
        console.error(' -', `"iotz compile" might fail. please add the \n "target":"${target_board}"\n on iotz.json file`);
      }
    }

    var ppr = process.platform === "win32" ? "" : "\\";
    var libs = ` && mkdir -p iotz-mbed-deps && find . -name '*.lib' -exec cat {}\
 \\; | while read line; do cd iotz-mbed-deps && mbed add ${ppr}$line 2>/dev/null || cd .. && cd .. ; done\
 && if [ -d iotz-mbed-deps/mbed-os ]; then rm -rf mbed-os && mv iotz-mbed-deps/mbed-os .; fi`;
    if (config.deps) {
      for (let lib of config.deps) {
        if (lib) {
          if (!lib.url) {
            console.error(" -", colors.red("error :"),
              "Unknown config ", JSON.stringify(lib, 0, 2));
          } else {
            if (lib.url.indexOf(lib.name) == -1) {
              console.error(" -", colors.red('error :'), "library name is case sensitive.");
              console.error("   ", `${lib.name} should match the name in ${lib.url}`);
              process.exit(1);
            }
            if (lib.name != 'mbed-os') {
              libs += ` && rm -rf iotz-mbed-deps/${lib.name} && mbed add ${lib.url} iotz-mbed-deps/${lib.name}`;
            } else {
              libs += ` && rm -rf ${lib.name} && mbed add ${lib.url}`;
            }
          }
        }
      };
    }

    var importMbed = "";
    if (libs.indexOf("/mbed-os/#") > 0) {
      importMbed = "--create-only";
    }

    // if project seeks a specific version of MBED, import and use it instead
    libs = `mbed new . ${importMbed} --depth 1 && mbed target ${target_board} && mbed toolchain GCC_ARM` + libs;
    runString = exports.build(config, runCmd, 'clean').run + " && " + libs;

    callback = function(config) {
      if (config.hasOwnProperty("mbed_app.json")) {
        var mbedjsonFilePath = path.join(process.cwd(), 'iotz-mbed-deps', 'mbed_app.json');
        var newjson = JSON.stringify(config["mbed_app.json"], 0, 2);
        fs.writeFileSync(mbedjsonFilePath, newjson);
      }
    }

    if (!config.target) {
      runString += `\
 && mbed target -S && \
echo -e \
'${colors.yellow('you should define the "target" from the above.')}\
Please update ${colors.magenta('iotz.json')} with "target".'
`;
    }
  } else if (command == "clean") {
    runString = "rm -rf iotz-mbed-deps/ BUILD/ .mbed mbed/ mbed-os.lib mbed-os/ mbed_settings.py*"
  } else if (command == 'compile') {
    var source = checkSource(config);
    runString = `mbed compile ${source}`;
  } else if (command == 'export') {
    var source = checkSource(config);
    runString = `mbed export --ide make_gcc_arm ${source}`;
    callback = function(config) {
      var mpath = path.join(process.cwd(), "Makefile");
      if (!fs.existsSync(mpath)) {
        console.error(" -", colors.red('error'), 'Unable to find Makefile on the current path');
        process.exit(1);
      }
      var source = fs.readFileSync(mpath) + "";
      source = source.replace("CPP     = 'arm-none-eabi-g++'",
        "CPP     = 'arm-none-eabi-g++' '-fdiagnostics-color=always'");
      source = source.replace("C     = 'arm-none-eabi-gcc'",
        "CC     = 'arm-none-eabi-gcc' '-fdiagnostics-color=always'");
      fs.writeFileSync(mpath, source);

      console.log(colors.green("Makefile"), "is ready.\nTry ",
        colors.magenta('iotz make -j2'));
    }
  } else {
    console.error(" -", colors.red("error :"),
              "Unknown command", command);
    process.exit(1);
  }

  return {
    run: runString,
    callback: callback
  };
} // mbedBuild

exports.createProject = function createProject(compile_path, runCmd) {
  console.log("under construction :)")
  console.log("please visit the test folder for mbed project samples");
}