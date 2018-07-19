// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const fs     = require('fs');
const path   = require('path');

const ARDUINO_VERSION = "1.8.5";

function findBoard(name) {
  var src = name.toLowerCase();

  for (let boardName in boardNames) {
    if (!boardNames.hasOwnProperty(boardName)) continue;
    var lbname = boardNames[boardName].toLowerCase();
    if (src == boardName || (src.length > 3 && lbname.indexOf(src) >= 0)) {
      return boardNames[boardName];
    }
  }

  return null;
}

function printBoards() {
  console.error(' -', colors.yellow('full list below'));
  var boards = "\t";
  var counter = 0;
  for (let boardName in boardNames) {
    if (!boardNames.hasOwnProperty(boardName)) continue;
    if (counter == 5) {
      boards += "\n\t"
      counter = 0;
    }
    if (counter != 0) {
      boards += " - ";
    }
    counter++;
    boards += boardName
  }
  console.error(boards);
}

exports.detectProject = function(compile_path, runCmd, command) {
  // try to detect by .ino
  var detected = null;
  var files = fs.readdirSync(compile_path);
  for (let file of files) {
    if (path.extname(file).toLowerCase() == '.ino') {
      detected = {
        "toolchain": "arduino",
        "filename": file
      };
      break;
    }
  };

  // try to detect by board name
  if (typeof runCmd === "string" && runCmd.length >= 2)
  {
    var found = findBoard(runCmd);
    if (found) {
      if (!detected) detected = {"toolchain":"arduino"};
      detected.target = found;
    }
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

const boardNames = {
  "uno": "arduino:avr:uno",
  "yun": "arduino:avr:yun",
  "diecimila": "arduino:avr:diecimila",
  "nano": "arduino:avr:nano",
  "mega": "arduino:avr:mega",
  "megaadk": "arduino:avr:megaADK",
  "leonardo": "arduino:avr:leonardo",
  "micro": "arduino:avr:micro",
  "esplora": "arduino:avr:esplora",
  "mini": "arduino:avr:mini",
  "ethernet": "arduino:avr:ethernet",
  "fio": "arduino:avr:fio",
  "bt": "arduino:avr:bt",
  "lilypad": "arduino:avr:lilypad",
  "lilypadusb": "arduino:avr:LilyPadUSB",
  "pro": "arduino:avr:pro",
  "atmegang": "arduino:avr:atmegang",
  "atmegang": "arduino:avr:atmegang",
  "robotMotor": "arduino:avr:robotMotor",
  "arduino_due_x_dbg": "arduino:sam:arduino_due_x_dbg",
  "arduino_due_x": "arduino:sam:arduino_due_x",
  "tinyg": "arduino:avr:tinyg",
  "az3166": "AZ3166:stm32f4:MXCHIP_AZ3166",
  "mxchip": "AZ3166:stm32f4:MXCHIP_AZ3166"
};

exports.build = function arduinoBuild(config, runCmd, command, compile_path) {
  var target_board = config.target;
  var callback = null;
  var runString = "";

  if (config && !config.filename) {
    if (command == "compile" || command == "export") {
      var files = fs.readdirSync(compile_path);
      for (let file of files) {
        if (path.extname(file).toLowerCase() == '.ino') {
          console.log(" -", colors.yellow("warning"));
          console.log(" -", "picked", colors.magenta(file), " automatically as a project file");
          console.log(" -", "you can define it from 'iotz.json' 'filename'");
          config.filename = file;
          break;
        }
      }
    }
  }

  if (command == 'init') {
    // noop
  } else if (command == 'container_init') {
    var install_board = "";
    var boardFound = false;

    // search for the board from command args
    if (typeof runCmd === 'string' && runCmd.length && target_board != runCmd) {
      // don't let setting target board from multiple places
      if (target_board) {
        console.error(" -", colors.yellow('warning:'), 'iotz.json file has target board defined already.');
      } else {
        target_board = findBoard(runCmd);
        if (target_board) {
            console.log(" -", colors.green(target_board), "is selected");
            boardFound = true;
        }
      } // target_board
    } // typeof runCmd === 'string' .....

    if (!target_board) {
      console.error(' -', colors.red('error:'), 'Arduino project is detected. Target board is required.');
      console.error(' -', colors.bold('try'), '"iotz init uno", if target board is uno');
      printBoards();
      process.exit(1);
    } else if (!boardFound) { // target_board
      var src = target_board.toLowerCase();

      for (let boardName in boardNames) {
        if (!boardNames.hasOwnProperty(boardName)) continue;
        if (src == boardName) {
          target_board = boardNames[boardName];
          console.log(" -", colors.green(boardNames[boardName]), "is selected");
          boardFound = true;
          break;
        }
      }
    }

    if (boardFound) {
      // update iotz.json
      config.target = target_board;
      try {
        fs.writeFileSync(path.join(compile_path, 'iotz.json'), JSON.stringify(config, 0, 2));
        console.log(' -', 'successfully updated target on iotz.json file');
      } catch (e) {
        console.error(' -', colors.red('error:'), "couldn't update iotz.json with the target board.");
        console.error(' -', `"iotz compile" might fail. please add the \n "target":"${target_board}"\n on iotz.json file`);
      }
    }

    if (target_board != "AZ3166:stm32f4:MXCHIP_AZ3166") {
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
  } else if (command == 'compile') { // build
    var patch_step = "";
    switch (config.target.toLowerCase()) {
      case "az3166:stm32f4:mxchip_az3166":
        if (process.platform === "win32") {
          patch_step =  " && cd /root/.arduino15/packages/AZ3166/hardware/stm32f4/ && cd `ls | awk '{print $1}'`"
        } else {
          patch_step =  " && cd /root/.arduino15/packages/AZ3166/hardware/stm32f4/ && cd \\`ls | awk '{print \\$1}'\\`"
        }
        patch_step += " && cp bootloader/boot.bin /tools"
        patch_step += ` && python /tools/boot_patch.py /src/program/BUILD/${config.filename}.bin /src/program/BUILD/${config.filename}o.bin`
        patch_step += ` && rm /src/program/BUILD/${config.filename}.bin`
        patch_step += ` && mv /src/program/BUILD/${config.filename}o.bin /src/program/BUILD/${config.filename}.bin`
      break;
      default:
    };
    runString = `arduino --board '${target_board}' --verify '${config.filename}' --pref build.path=/src/program/BUILD ${patch_step}`;
  } else if (command == 'export') {
    var makefile = `
# ----------------------------------------------------------------------------
#  Copyright (C) Microsoft. All rights reserved.
#  Licensed under the MIT license.
# ----------------------------------------------------------------------------

all:
	arduino --board '${target_board}' --verify '${config.filename}' --pref build.path=/src/program/BUILD
clean :
	iotz run mr -rf BUILD/
`;
    fs.writeFileSync(path.join(compile_path, 'Makefile'), makefile);
    console.log(colors.green("Makefile"), "is ready.\nTry ",
        colors.magenta('iotz make -j2'));
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
  var board = findBoard(args[0]);
  if (!board) {
    console.error(" -", colors.red("error :"),
              "Unknown board name", args[0]);
    printBoards();
    process.exit(1);
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
// sample arduino file

void setup() { }

void loop() {
  printf("hello world!\\r\\n");
  delay(1);
}
`;

  var config = `
{
  "name":"${projectName}",
  "toolchain":"arduino",
  "target":"${board}",
  "filename":"${projectName}.ino"
}
`;

  fs.writeFileSync(path.join(target_folder, `${projectName}.ino`), example);
  fs.writeFileSync(path.join(target_folder, `iotz.json`), config);
  console.log(" -", colors.green('done!'));
};