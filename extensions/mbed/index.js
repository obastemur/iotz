// ----------------------------------------------------------------------------
//  See LICENSE.md file
// ----------------------------------------------------------------------------
'use strict';

const colors = require('colors/safe');
const fs = require('fs');
const path = require('path');
const isWindows = process.platform === 'win32';

exports.detectProject = function(compile_path, runCmd, command) {
  var detected = null;
  if (fs.existsSync(path.join(compile_path, '.mbed')) || fs.existsSync(path.join(compile_path, 'mbed_app.json')) ||
    fs.existsSync(path.join(compile_path, 'mbed-os.lib'))) {
    detected = {
      'toolchain': 'mbed'
    };
  }

  var args = [];
  if (typeof runCmd === 'string' && runCmd.length) {
    args = runCmd.split(' ');
  }

  if (!detected || args.length > 1) {
    if (!detected && (command == 'mbed' || args[0] == 'mbed')) {
      detected = {
        'toolchain': 'mbed'
      };
    }

    if (detected && args.length > 1) {
      detected.target = args[1]; // deviceId
    }
  }

  return detected;
};

exports.selfCall = function(config, runCmd, command, compile_path) {
  if (runCmd !== -1) {
    runCmd = command + ' ' + runCmd;
  } else {
    runCmd = command;
  }
  return runCmd;
};

exports.createExtension = function() {
  return {
    run :`
      RUN echo -e " - installing ARM mbed tools"

      RUN apt-get update && apt-get install -y libudev-dev libsystemd-dev libusb-1.0-0-dev mercurial && apt clean \ 
        && pip install --upgrade pip && pip install mbed-cli && pip install future && pip install intelhex && pip install setuptools --upgrade \
        && mkdir XXX && cd XXX && echo "#include <mbed.h>\\nint main(){return 0;}" > main.cpp \
        && mbed new . \
        && pip install -r /src/XXX/mbed-os/requirements.txt \
        && cd .. && rm -rf XXX \
        && mkdir /tools && cd /tools \
        && wget "https://developer.arm.com/-/media/Files/downloads/gnu-rm/6-2017q2/gcc-arm-none-eabi-6-2017-q2-update-linux.tar.bz2" \
        && bunzip2 gcc-arm-none-eabi-6-2017-q2-update-linux.tar.bz2 \
        && tar -xvf gcc-arm-none-eabi-6-2017-q2-update-linux.tar \
        && rm -rf gcc-arm-none-eabi-6-2017-q2-update/share/doc/ \
        && rm -rf gcc-arm-none-eabi-6-2017-q2-update-linux.tar \
        && mbed config --global GCC_ARM_PATH /tools/gcc-arm-none-eabi-6-2017-q2-update/bin \
        && pip install fuzzywuzzy
      `,
    callback: null
  };
};

exports.addFeatures = function(config, runCmd, command, compile_path) {
  if (command == 'mbed') {
    return {
      run: 'mbed ' + (runCmd != -1 ? runCmd : ''),
      calllback: null
    };
  }
};

var checkSource = function checkSource(config) {
  var source = '';
  if (config.hasOwnProperty('mbed_app.json')) {
    var basejson = '';
    var mbedjsonFilePath = path.join(process.cwd(), 'iotz-mbed-deps', 'mbed_app.json');
    if (fs.existsSync(mbedjsonFilePath)) {
      basejson = fs.readFileSync(mbedjsonFilePath) + '';
    }

    var newjson = JSON.stringify(config['mbed_app.json'], 0, 2);
    if (basejson != newjson) {
      // update mbed_app.json
      fs.writeFileSync(mbedjsonFilePath, newjson);
    }
    source = '--app-config iotz-mbed-deps/mbed_app.json';
  }
  return source;
};

exports.buildCommands = function mbedBuild(config, runCmd, command, compile_path, mount_path) {
  var target_board = config.target;
  var runString = '', source;
  var callback = null;

  if (command == 'localFolderContainerConstructer') {
    // noop
  } else if (command == 'init') {
    if (typeof runCmd === 'string' && runCmd.length) {
      // don't let setting target board from multiple places
      var detected = exports.detectProject(compile_path, runCmd, command);
      if (detected && (detected.target || target_board) && target_board != detected.target) {
        if (target_board) {
          console.error(' -', colors.bold('warning:'), 'updating the target board definition on iotz.json file.');
        }
        target_board = config.target;
        try {
          fs.writeFileSync(path.join(compile_path, 'iotz.json'), JSON.stringify(config, 0, 2));
          console.log(' -', 'successfully updated target on iotz.json file');
        } catch (e) {
          console.error(' -', colors.bold('error:'), 'couldn\'t update iotz.json with the target board.');
          console.error('  ', e.message);
          console.error(' -', `"iotz compile" might fail. please add the \n "target":"${target_board}"\n on iotz.json file`);
        }
      } else if (!detected.target && !target_board) {
        return {
          run: runString,
          callback: function() {
            console.log('Done!');
          }
        };
      }
    }

    var bslash = isWindows ? '' : '\\';
    var libs = ` && mkdir -p iotz-mbed-deps && find . -type f -iname '*.lib' ! -iname 'mbed-os.lib' -exec cat {}\
 \\; | while read line; do cd iotz-mbed-deps && mbed add ${bslash}$line 2>/dev/null || cd .. && cd .. ; done\
 && if [ -d iotz-mbed-deps/mbed-os ]; then rm -rf mbed-os && mv iotz-mbed-deps/mbed-os .; fi`;
    if (config.deps) {
      for (let lib of config.deps) {
        if (lib) {
          if (!lib.url) {
            console.error(' -', colors.bold('error :'),
              'Unknown config ', JSON.stringify(lib, 0, 2));
          } else {
            if (lib.url.indexOf(lib.name) == -1) {
              console.error(' -', colors.bold('error :'), 'library name is case sensitive.');
              console.error('   ', `${lib.name} should match the name in ${lib.url}`);
              process.exit(1);
            }
            if (lib.name != 'mbed-os') {
              libs += ` && rm -rf iotz-mbed-deps/${lib.name} && mbed add ${lib.url} iotz-mbed-deps/${lib.name}`;
            } else {
              libs += ` && rm -rf ${lib.name} && mbed add ${lib.url}`;
            }
          }
        }
      }
    }

    var importMbed = '';
    if (libs.indexOf('/mbed-os/#') > 0) {
      importMbed = '--create-only';
    }

    // if project seeks a specific version of MBED, import and use it instead
    libs = `mbed new . ${importMbed} --depth 1 && mbed target ${target_board} && mbed toolchain GCC_ARM` + libs;
    runString = exports.buildCommands(config, runCmd, 'clean').run + ' && ' + libs;

    callback = function(config) {
      if (config.hasOwnProperty('mbed_app.json')) {
        var mbedjsonFilePath = path.join(process.cwd(), 'iotz-mbed-deps', 'mbed_app.json');
        var newjson = JSON.stringify(config['mbed_app.json'], 0, 2);
        fs.writeFileSync(mbedjsonFilePath, newjson);
      }
    };

    if (!config.target) {
      runString += `\
 && mbed target -S && \
echo -e \
'${colors.bold('you should define the "target" from the above.')}\
Please update ${colors.bold('iotz.json')} with "target".'
`;
    }
  } else if (command == 'clean') {
    runString = 'rm -rf iotz-mbed-deps/ BUILD/ .mbed mbed/ mbed-os.lib mbed-os/ mbed_settings.py*';
  } else if (command == 'compile') {
    source = checkSource(config);
    runString = `mbed compile ${source}`;
  } else if (command == 'export') {
    source = checkSource(config);
    runString = `mbed export --ide make_gcc_arm ${source}`;
    callback = function(config) {
      var mpath = path.join(process.cwd(), 'Makefile');
      if (!fs.existsSync(mpath)) {
        console.error(' -', colors.bold('error'), 'Unable to find Makefile on the current path');
        process.exit(1);
      }

      source = fs.readFileSync(mpath) + '';
      source = source.replace('CPP     = \'arm-none-eabi-g++\'',
        'CPP     = \'arm-none-eabi-g++\' \'-fdiagnostics-color=always\'');
      source = source.replace('C     = \'arm-none-eabi-gcc\'',
        'CC     = \'arm-none-eabi-gcc\' \'-fdiagnostics-color=always\'');
      fs.writeFileSync(mpath, source);

      console.log(colors.bold('Makefile'), 'is ready.\nTry ',
        colors.bold('iotz make -j2'));
    };
  } else {
    console.error(' -', colors.bold('error :'),
      'Unknown command', command);
    process.exit(1);
  }

  return {
    run: runString,
    callback: callback
  };
}; // mbedBuild

exports.createProject = function createProject(compile_path, runCmd) {
  var args = (typeof runCmd === 'string') ? runCmd.split(' ') : [];
  var board;
  if (!args.length) {
    console.error(' -', colors.bold('error :'),
      'Unknown board name', args[0]);
    console.log('List of supported devices are available under https://os.mbed.com/platforms/');
    process.exit(1);
  } else {
    board = args[0];
  }

  var projectName;
  if (args.length > 1) {
    projectName = args[1];
  }

  var target_folder;
  if (projectName) {
    target_folder = path.join(compile_path, projectName);
    try {
      fs.mkdirSync(target_folder);
    } catch(e) {
      if (!fs.existsSync(target_folder)) {
        console.error(' -', colors.bold('error:'), 'cant\'t create folder', projectName);
        process.exit(1);
      }
    }
  } else {
    target_folder = compile_path;
    projectName = 'sampleApplication';
  }

  var example = `
// iotz
// sample mbed file

#include "mbed.h"

DigitalOut myled(LED1);

int main() {
    while(1) {
        myled = 1; // LED is ON
        wait(0.2); // 200 ms
        myled = 0; // LED is OFF
        wait(1.0); // 1 sec
    }
}
`;

  var config = `
{
  "name":"${projectName}",
  "toolchain":"mbed",
  "target":"${board}"
}
`;

  fs.writeFileSync(path.join(target_folder, `${projectName}.cpp`), example);
  fs.writeFileSync(path.join(target_folder, 'iotz.json'), config);
  console.log(' -', colors.bold('done!'));
};
