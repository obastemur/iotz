// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const colors = require('colors/safe');
const HOME_DIR = require('os').homedir();

exports.requireExtension = function (name, no_fail) {
  if (typeof name === 'string')
    name = name.replace(/\\/g, "").replace(/\//g, "");
  else {
    console.error(" - error:", colors.red('extension'), name, "not found");
    process.exit(1);
  }

  try {
    // try local
    return require(`./${name}`);
  } catch (_) {
    // TODO: log this ? (that's why the separation)
    try {
      // search global
      return require(name);
    } catch (__) {
      if (!no_fail) {
        console.error(" - error:", colors.red('extension'), name, "not found");
        process.exit(1);
      }
    }
  }

  return null;
}

exports.getConfigPath = function getConfigPath() {
  // check write access to home folder and see if .iotz folder exists
  var iotzHome = path.join(HOME_DIR, ".iotz");
  if (!fs.existsSync(iotzHome)) {
    try {
      fs.mkdirSync(iotzHome);
    } catch(e) {
      console.error("error:", "couldn't create", iotzHome, "folder to store configuration.");
    }
  }
  return iotzHome;
}

exports.readConfig = function readConfig() {
  try {
    var iotzHome = exports.getConfigPath();
    if (!fs.existsSync(path.join(iotzHome, "config.json"))) {
      // try to create config
      if (exports.updateConfig({}) != 0) return null;
    }
    var config = fs.readFileSync(path.join(iotzHome, "config.json")) + "";
    return JSON.parse(config);
  } catch(e) {
    console.log(" -", colors.red('error:'), e);
  }

  return null;
}

exports.updateConfig = function updateConfig(config) {
  try {
    var iotzHome = exports.getConfigPath();
    fs.writeFileSync(path.join(iotzHome, "config.json"), JSON.stringify(config));
    return 0;
  } catch(e) {
    console.log(" -", colors.red('error:'), e);
  }

  return -1;
}

exports.getToolchain = function(name) {
  var config = exports.readConfig();
  if (!config.hasOwnProperty('extensions')) {
    config.extensions = {}; // fake it. we need to create a local container anyways
  }

  if (config.extensions.hasOwnProperty(name)) {
    return name;
  } else {
    return exports.installToolchain(name);
  }
}

exports.installToolchain = function(name) {
  var config = exports.readConfig();
  if (!config.hasOwnProperty('extensions')) {
    config.extensions = {}; // fake it. we need to create local container anyways
  }

  if (!config.extensions.hasOwnProperty(name)) {
    config.extensions[name] = {};
    exports.createContainer(name);
    exports.updateConfig(config);
  }

  return name;
}

exports.updateExtensions = function(compile_path) {
  var ino = fs.statSync(compile_path).ino;
  var container_name = "aiot_iotz_" + ino;
  try {
    // clean up the previously stopped instance
    execSync(`docker image rm -f ${container_name} 2>&1`);
  } catch(e) { }

  console.log(" -", "updating extensions");
  // recreate
  return exports.createLocalContainers();
}

// azureiot/iotz_local
// sync only
exports.createLocalContainers = function() {
  var config = exports.readConfig();
  if (!config.hasOwnProperty('extensions')) {
    config.extensions = {}; // fake it. we need to create local container anyways
  }

  for (var name in config.extensions) {
    if (!config.extensions.hasOwnProperty(name)) continue;
    exports.createContainer(name);
  }
};

exports.createContainer = function(name) {
  var rext = name != 'default' ? exports.requireExtension(name) : null;
  var extInfo = rext ? rext.createExtension() : {run: ""};

  if (rext) {
    console.log(" -", "building", colors.bold(name), 'extension container',
                '(it may take some time)');
  }

  var libs = `
  FROM azureiot/iotz:latest

  WORKDIR /src

  RUN echo "Setting up azureiot/iotz_local_${name}"
  ${extInfo.run}
  `;

  var iotzHome = exports.getConfigPath();
  fs.writeFileSync(path.join(iotzHome, name + '.Dockerfile'), libs);

    // wipe the previous one (if there is)
  try {
    execSync(`docker image rm -f azureiot/iotz_local_${name} 2>&1`)
  } catch(e) { }

  var batchString = `docker build . -f ${name}.Dockerfile --force-rm -t azureiot/iotz_local_${name}`;
  execSync(`cd ${iotzHome} && ` + batchString, {stdio:[2], cwd:iotzHome});
  if (extInfo.callback) {
    extInfo.callback();
  }
}

exports.detectProject = function detectProject(compile_path, runCmd, command) {
  var config = exports.readConfig();
  var exts = config && config.extensions ? config.extensions : {};

  // search extensions path
  var files = fs.readdirSync(__dirname);
  for (let file of files) {
    var p = path.join(__dirname, file);
    var pstat = fs.statSync(p);
    if (pstat.isDirectory()) {
      exts[file] = {};
    }
  };

  var potentialExtension = (typeof runCmd === 'string') ? runCmd.split(' ')[0] : null;
  if (potentialExtension && exports.requireExtension(potentialExtension, true) != null) {
    return exports.requireExtension(potentialExtension).detectProject(compile_path, runCmd, command);
  }

  var detected = null;
  for (var name in exts) {
    if (!exts.hasOwnProperty(name)) continue;
    var dd = exports.requireExtension(name).detectProject(compile_path, runCmd, command);
    if (dd) {
      if (detected) {
        console.error(" -", colors.red('error:'), "more than one extensions detected this folder as their type.");
        console.error(" -", "please define the toolchain and target under iotz.json file manually.");
        return false;
      }
      detected = dd;
    }
  }

  return detected;
}

exports.createProject = function createProject(compile_path, runCmd) {
  if (typeof runCmd !== "string" || runCmd.length == 0) {
    console.error(" -", colors.red("error:"), "please specify the type of project you want to create\r\n");
    console.error("   usage: iotz create <toolchain> <optional target> <optional project name>");
    console.error("   i.e.");
    console.error("   iotz create arduino yun");
    console.error("   iotz create arduino yun myproj");
    console.error("   iotz create raspberry");
    console.error("   iotz create raspberry myproj");
    process.exit(1);
  }

  var args = runCmd.split(' ');
  var ext  = exports.requireExtension(args[0]);
  ext.createProject(compile_path, runCmd.substr(args[0].length + 1));
}