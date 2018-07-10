// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const fs     = require('fs');
const path   = require('path');

const ARDUINO_VERSION = "1.8.5";

exports.detectProject = function(compile_path) {
  return false;
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
  RUN echo -e " - installing Arduino tools"
  WORKDIR /tools
  RUN curl "https://downloads.arduino.cc/arduino-${ARDUINO_VERSION}-linux64.tar.xz" -o arduino.tar.xz

  COPY arduino/arduino15.base arduino/boot_patch.py /tools/

  RUN  mv arduino15.base arduino15.tar.gz \
    && tar xf arduino.tar.xz && tar xfz arduino15.tar.gz \
    && rm arduino.tar.xz && rm arduino15.tar.gz \
    && ln -s /tools/arduino-1.8.5/arduino-builder /usr/local/bin/arduino-builder \
    && ln -s /tools/arduino-1.8.5/arduino /usr/local/bin/arduino \
    && mv .arduino15 ~/
  `;
};

exports.build = function arduinoBuild(config, runCmd, command, compile_path) {
  var target_board = config.target;
  var callback = null;
  var runString = "";

  if (command == 'init') {
    // noop
  } else if (command == 'container_init') {
    var install_board = "";
    if ( target_board != "AZ3166:stm32f4:MXCHIP_AZ3166") {
      // crop the first two segments (i.e. arduino:avr:xxxx -> arduino:avr)
      var names = target_board.split(':');
      if (names.length < 3) {
        console.error(' -', colors.red('error'), 'invalid target board name for arduino. try --help ?');
        process.exit(1);
      }
      var brandName = names[0] + ":" + names[1];

      install_board = "arduino --install-boards " + brandName;
    } else {
      // install always the latest
      var tweak = fs.readFileSync(path.join(__dirname, 'tweaks', 'az3166', 'platform.txt'));
      fs.writeFileSync(path.join(compile_path, ".iotz.mxchip.tweak"), tweak);
      install_board = ` echo
COPY .iotz.mxchip.tweak /src/program/.iotz.mxchip.tweak

RUN arduino --install-boards AZ3166:stm32f4 && \
    rm ~/.arduino15/packages/AZ3166/hardware/stm32f4/1.3.7/platform.txt && \
    mv /src/program/.iotz.mxchip.tweak ~/.arduino15/packages/AZ3166/hardware/stm32f4/1.3.7/platform.txt`;
    }

    runString = install_board;
  } else if (command == 'clean') {
    runString = "rm -rf BUILD/ .arduino15/";
    callback = function(config) {
      var ino = fs.statSync(compile_path).ino;
      var container_name = "aiot_iotz_" + ino;
      try {
        // clean up the previously stopped instance
        execSync(`docker image rm -f ${container_name} 2>&1`);
      } catch(e) { }
    };
  } else if (command == 'compile') { // build
    var patch_step = "";
    switch (config.target.toLowerCase()) {
      case "az3166:stm32f4:mxchip_az3166":
        patch_step =  " && cd /root/.arduino15/packages/AZ3166/hardware/stm32f4/ && cd \\`ls | awk '{print \\$1}'\\`"
        patch_step += " && cp bootloader/boot.bin /tools"
        patch_step += ` && python /tools/boot_patch.py /src/program/BUILD/${config.filename}.bin /src/program/BUILD/${config.filename}o.bin`
        patch_step += ` && rm /src/program/BUILD/${config.filename}.bin`
        patch_step += ` && mv /src/program/BUILD/${config.filename}o.bin /src/program/BUILD/${config.filename}.bin`
      break;
      default:
    };
    runString = `arduino --board '${target_board}' --verify '${config.filename}' --pref build.path=/src/program/BUILD ${patch_step}`;
  } else if (command == 'export') {
    console.error(" -", console.red("error :"),
              "export from arduino projects is not yet supported");
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