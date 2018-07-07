// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const fs     = require('fs');
const path   = require('path');

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
      var tweak = fs.readFileSync(path.join(__dirname, '../tweaks/az3166/platform.txt'));
      fs.writeFileSync(path.join(compile_path, ".iotc.mxchip.tweak"), tweak);
      install_board = ` echo
COPY .iotc.mxchip.tweak /src/program/.iotc.mxchip.tweak

RUN arduino --install-boards AZ3166:stm32f4 && \
    rm ~/.arduino15/packages/AZ3166/hardware/stm32f4/1.3.7/platform.txt && \
    mv /src/program/.iotc.mxchip.tweak ~/.arduino15/packages/AZ3166/hardware/stm32f4/1.3.7/platform.txt`;
    }

    runString = install_board;
  } else if (command == 'clean') {
    runString = "rm -rf BUILD/ .arduino15/";
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
    console.error(" - ", console.red("error :"),
              "export from arduino projects is not yet supported");
    process.exit(1);
  } else {
    console.error(" - ", console.red("error :"),
              "Unknown command", command);
    process.exit(1);
  }

  return {
    run: runString,
    callback: callback
  };
}