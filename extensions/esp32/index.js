// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const path = require('path');
const fs = require('fs');
const execSync = require('child_process').execSync;

exports.detectProject = function(compile_path, runCmd, command) {
  return false;
}

exports.selfCall = function(config, runCmd, command, compile_path) {
  return exports.buildCommands(config, runCmd, "compile", compile_path).run;
};

exports.createExtension = function() {
  var runString = `
  RUN echo -e " - installing ESP32 tools"
  WORKDIR /tools
  RUN apt-get install -y wget libncurses-dev flex bison gperf python-serial \
    && mkdir esp && cd esp && wget https://dl.espressif.com/dl/xtensa-esp32-elf-linux64-1.22.0-59.tar.gz \
    && tar -xzf xtensa-esp32-elf-linux64-1.22.0-59.tar.gz \
    && rm xtensa-esp32-elf-linux64-1.22.0-59.tar.gz \
    && git clone --recursive https://github.com/espressif/esp-idf.git
  ENV IDF_PATH /tools/esp/esp-idf
  ENV PATH /tools/esp/xtensa-esp32-elf/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
  `;

  return {
    run: runString,
    callback : null
  };
};

exports.buildCommands = function esp32build(config, runCmd, command, compile_path) {
  var callback = null;
  var runString = "";

  if (command == 'init') {
    // noop
  } else if (command == 'localFolderContainerConstructer') {
    // noop
  } else if (command == 'clean') {
    runString = "make clean"
  } else if (command == 'compile') {
    runString = "make " + (runCmd != -1 ? runCmd : "")
  } else if (command == 'export') {
    // noop
    console.error("ESP32 extension doesn't define any additional export target");
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

  var projectName = "sampleApplication";
  if (args.length) {
    projectName = args[0];
  }

  var config = `
{
  "name":"${projectName}",
  "toolchain":"esp32"
}
`;
  var target_folder = path.join(compile_path, projectName);
  execSync(`cd ${compile_path} && git clone https://github.com/espressif/esp-idf-template.git ${projectName}`);

  fs.writeFileSync(path.join(target_folder, `iotz.json`), config);
  console.log(" -", colors.green('done!'), "project is created at", target_folder);
};