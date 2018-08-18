// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const fs     = require('fs');
const path   = require('path');
const execSync = require('child_process').execSync;

const ARDUINO_VERSION = "1.8.5";

function findBoard(name) {
  var src = name.toLowerCase();
  var boardNames = getBoardNames();
  for (let boardName in boardNames) {
    if (!boardNames.hasOwnProperty(boardName)) continue;
    var codename = boardNames[boardName].codename;
    var longname = boardNames[boardName].longname.toLowerCase();
    if (src == boardName || codename == name || (src.length > 3
        && codename.toLowerCase().indexOf(src) >= 0) || src == longname) {
      return boardNames[boardName];
    }
  }

  return null;
}

function printBoards() {
  console.error(' -', colors.yellow('full list below'));
  var boards = "\t";
  var counter = 0;
  var boardNames = getBoardNames();
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
  }

  // try to detect by board name
  if (typeof runCmd === "string" && runCmd.length >= 2)
  {
    var found = findBoard(runCmd);
    if (found) {
      if (!detected) detected = {"toolchain":"arduino"};
      detected.target = found.codename;;
    }
  }

  return detected;
}

exports.selfCall = function(config, runCmd, command, compile_path) {
  if (runCmd !== -1) {
    runCmd = command + " " + runCmd;
  } else {
    runCmd = command;
  }
  return runCmd;
}

var preInstalledPlatforms =
{
  "arduino:avr" : 1,
  "esp8266:esp8266" : 1,
  "AZ3166:stm32f4" : 1
};

var boardNames_ = null;
var getBoardNames = function() {
  if (boardNames_ != null) return boardNames_;

  var PLATFORM_SEP = 'IOTZ_BOARD_FILE_PATH=';
  var config = fs.readFileSync(path.join(__dirname, "boards.config")) + "";
  if (process.platform === "win32") {
    config = config.replace(/\r\n/g, "\n");
  }

  // parse boards.config file
  var getPlatforms = function() {
    var ind = -1;
    var platforms = [];
    while ((ind = config.indexOf(PLATFORM_SEP, ind + 1)) != -1) {
      platforms.push(ind);
    }
    return platforms;
  }

  var getCustomConfigs = function(subconfig) {
    var startIndex = subconfig.indexOf('\nmenu.');
    if (startIndex != -1) {
      startIndex ++; // ditch \n
    } else {
      return null; // no custom config
    }

    var lastIndex = subconfig.search(/(####)(#)+(\n)+/);
    var customarr = subconfig.substr(startIndex, lastIndex - startIndex).split('\n');
    var customNames = [];
    for (var i = 0; i < customarr.length; i++) {
      var line = customarr[i];
      if (line.trim().length < 5) // menu.
      {
        continue;
      }

      line = line.trim().replace('menu.', '');
      if (line.indexOf('=') == -1) {
        console.error(' -', colors.yellow('warning'), 'unidentified config at \n'
          + subConfig.substr(0, startIndex) + "\n@ -> " + line);
        continue; // broken config?
      }
      var cn = line.substr(0, line.indexOf('=')).trim();
      if (cn.length == 0) continue;
      customNames.push(cn);
    }
    return customNames;
  }

  var getCustomConfig = function(subconfig, boardName, board, longName, customConfigs) {
    var name = boardName + board; // boardName.name=longName (board stands for .name=longName)
    var ind = subconfig.indexOf("\n", subconfig.indexOf(name));

    if (ind == -1) return []; // broken config?
    ind++; // ditch \n
    var lastIndex = subconfig.indexOf('.name=', ind);
    if (lastIndex == -1) // last board
      lastIndex = subconfig.length;

    var configs = subconfig.substr(ind, lastIndex - ind).split('\n');
    var list = [];
    for (var i = 0; i < customConfigs.length; i++) {
      var ccname = customConfigs[i];
      for (var j = 0; j < configs.length; j++) {
        var cstr = configs[j].trim();
        var clen = cstr.length;
        if (clen == 0) continue;
        cstr = cstr.replace(boardName + ".menu." + ccname + ".", "");
        if (clen != cstr.length) {
          var eqind = cstr.indexOf('=');
          if (eqind == -1) continue; // broken config?
          cstr = cstr.substr(0, eqind);
          cstr = "custom_" + ccname + "=" + boardName + "_" + cstr;
          list.push(cstr);
          break;
        }
      }
    }

    return list;
  }

  boardNames_ = {};
  var platforms = getPlatforms();
  for (var i = 0; i < platforms.length; i++) {
    var platformIndex = platforms[i];
    var nextPlatformIndex = i == platforms.length - 1 ? config.length : platforms[i + 1];
    var subconfig = config.substr(platformIndex, nextPlatformIndex - platformIndex);

    var platformURI = subconfig.substr(PLATFORM_SEP.length, subconfig.indexOf('\n') - PLATFORM_SEP.length);

    var packageName = platformURI.replace('/root/.arduino15/packages/', '');
    packageName = packageName.substr(0, packageName.indexOf('/hardware/'));
    var hardwareName = platformURI.replace('/root/.arduino15/packages/' + packageName + '/hardware/', '');
    hardwareName = hardwareName.substr(0, hardwareName.indexOf('/'));

    var customConfigs = getCustomConfigs(subconfig);
    var boards = subconfig.match(/.name=.+?(?=\n)/gi);
    for (var j = 0; j < boards.length; j++) {
      var board = boards[j];
      if (board.trim().length < 6) continue; // .name only. broken config?
      var ind = subconfig.indexOf(board);
      var k = ind - 1;
      for (; k >= 0; k--) {
        if (subconfig.charAt(k) == ' ' || subconfig.charAt(k) == '\n')
          break;
      }
      if (k < 0) continue; // broken config?
      var boardName = subconfig.substr(k + 1, ind - (k + 1));
      var longName = board.replace('.name=', '').trim();
      if ((ind = longName.indexOf('#')) >= 0) {
        if (ind == 0) {
          // broken config?
          continue;
        }
        // remove comments from name
        longName = longName.substr(0, ind);
      }

      var customconfig = getCustomConfig(subconfig, boardName, board, longName, customConfigs);
      var indexName = boardName;
      if (boardNames_.hasOwnProperty(indexName)) {
        indexName = packageName + " " + indexName;
      }

      boardNames_[indexName] = {
        name: indexName,
        longname: longName,
        codename: packageName + ":" + hardwareName + ":" + boardName,
        config: customconfig
      };
    }
  }

  return boardNames_;
}

function getAndParseArduinoConfig() {
  try {
    execSync(`\
docker run -t -v "${__dirname}":/src/iotz \
-w /src/iotz azureiot/iotz_local_arduino \
/bin/bash -c "find /root/.arduino15 -name 'boards.txt' -exec ./append_config.sh {} \\;"
    `, {stdio: 'inherit'});
  } catch (e) {
    return { error: e };
  }
}

exports.createExtension = function() {
  var preInstall = "";
  for(var platform in preInstalledPlatforms) {
    if (!preInstalledPlatforms.hasOwnProperty(platform)) continue;

    preInstall += `&& arduino --install-boards ${platform} `;
  }

  var runString = `
  RUN echo -e " - installing Arduino tools"
  WORKDIR /tools
  RUN curl "https://downloads.arduino.cc/arduino-${ARDUINO_VERSION}-linux64.tar.xz" -o arduino.tar.xz \
    && apt install -y gcc-avr avr-libc binutils-avr avrdude \
    && apt-get clean

  COPY arduino/preferences.txt /tools/.arduino15/
  COPY arduino/tweaks/az3166/az3166_boot_patch.py /tools/

  RUN  tar xf arduino.tar.xz \
    && rm arduino.tar.xz \
    && ln -s /tools/arduino-${ARDUINO_VERSION}/arduino-builder /usr/local/bin/arduino-builder \
    && ln -s /tools/arduino-${ARDUINO_VERSION}/arduino /usr/local/bin/arduino \
    && mv .arduino15 ~/ \
    ${preInstall}
  `;

  var callback = getAndParseArduinoConfig;

  return {
    run: runString,
    callback : callback
  };
}

exports.buildCommands = function arduinoBuild(config, runCmd, command, compile_path) {
  var target_board = config.target;
  var callback = null;
  var runString = "";
  var pathName = path.basename(compile_path);

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
  } else if (command == 'localFolderContainerConstructer') {
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
            target_board = target_board.codename;
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

      var boardNames = getBoardNames();
      for (let boardName in boardNames) {
        if (!boardNames.hasOwnProperty(boardName)) continue;
        if (src == boardName || boardNames[boardName].codename == target_board) {
          target_board = boardNames[boardName].codename;
          console.log(" -", colors.green(target_board), "is selected");
          boardFound = src == boardName;
          break;
        }
      }
    }

    if (boardFound || target_board) {
      // update iotz.json
      config.target = target_board;
      try {
        if (boardFound) {
          fs.writeFileSync(path.join(compile_path, 'iotz.json'), JSON.stringify(config, 0, 2));
          console.log(' -', 'successfully updated target on iotz.json file');
        }
      } catch (e) {
        console.error(' -', colors.red('error:'), "couldn't update iotz.json with the target board.");
        console.error(' -', `"iotz compile" might fail. please add the \n "target":"${target_board}"\n on iotz.json file`);
      }
    }

    // crop the first two segments (i.e. arduino:avr:xxxx -> arduino:avr)
    var names = target_board.split(':');
    if (names.length < 3) {
      if (names.length) {
        names = findBoard(names[0]);
        if (names) {
          target_board = names.codename;
          names = target_board.split(':');
          config.target = target_board;
          fs.writeFileSync(path.join(compile_path, 'iotz.json'), JSON.stringify(config, 0, 2));
          console.log(' -', 'successfully updated target on iotz.json file');
        }
      }
      if (names.length < 3) {
        console.error(' -', colors.red('error'), 'invalid target board name for arduino.');
        printBoards();
        process.exit(1);
      }
    }

    if (target_board == "AZ3166:stm32f4:MXCHIP_AZ3166") {
      var tweak = fs.readFileSync(path.join(__dirname, 'tweaks', 'az3166', 'platform.txt'));
      fs.writeFileSync(path.join(compile_path, ".iotz.mxchip.tweak"), tweak);

      var mxchip_folder =  "cd /root/.arduino15/packages/AZ3166/hardware/stm32f4/ && cd `ls | awk '{print $1}'`";
      install_board = ` echo
COPY .iotz.mxchip.tweak /tools/.iotz.mxchip.tweak

RUN ${mxchip_folder} && \
    rm ./platform.txt && \
    mv /tools/.iotz.mxchip.tweak ./platform.txt && `;
    }
    var brandName = names[0] + ":" + names[1];

    if (!preInstalledPlatforms.hasOwnProperty(brandName)) {
      install_board = "arduino --install-boards " + brandName + " && ";
    }

    var board = findBoard(target_board);
    if (board && board.config && board.config.length) {
      install_board += ` echo "${board.config.join('" >> /root/.arduino15/preferences.txt && echo "')}` + "\"";
    } else {
      install_board += ' true'
    }

    runString = install_board;
  } else if (command == 'clean') {
    runString = "rm -rf BUILD/ .arduino15/";
  } else if (command == 'compile') {
    var patch_step = "";
    switch (config.target.toLowerCase()) {
      case "az3166:stm32f4:mxchip_az3166":
        if (process.platform === "win32") {
          patch_step =  " && cd /root/.arduino15/packages/AZ3166/hardware/stm32f4/ && cd `ls | awk '{print $1}'`"
        } else {
          patch_step =  " && cd /root/.arduino15/packages/AZ3166/hardware/stm32f4/ && cd \\`ls | awk '{print \\$1}'\\`"
        }
        patch_step += " && cp bootloader/boot.bin /tools"
        patch_step += ` && python /tools/az3166_boot_patch.py /src/${pathName}/BUILD/${config.filename}.bin /src/${pathName}/BUILD/${config.filename}o.bin`
        patch_step += ` && mv /src/${pathName}/BUILD/${config.filename}.bin /src/${pathName}/BUILD/${config.filename}_no_bootloader.bin`
        patch_step += ` && mv /src/${pathName}/BUILD/${config.filename}o.bin /src/${pathName}/BUILD/${config.filename}.bin`
      break;
      default:
    };
    runString = `arduino --board '${target_board}' --verify '${config.filename}' --pref build.path=/src/${pathName}/BUILD ${patch_step}`;
  } else if (command == 'export') {
    var makefile = `
# ----------------------------------------------------------------------------
#  Copyright (C) Microsoft. All rights reserved.
#  Licensed under the MIT license.
# ----------------------------------------------------------------------------

all:
	arduino --board '${target_board}' --verify '${config.filename}' --pref build.path=/src/${pathName}/BUILD
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
  } else {
    board = board.codename;
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
}