// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const colors = require('colors/safe');

exports.requireExtension = function (name) {
  try {
    // try local
    return require(`./${name}`);
  } catch (_) {
    // TODO: log this ? (that's why the separation)
    try {
      // search global
      return require(name)
    } catch (__) {
      console.error(" - error:", colors.red('extension'), name, "not found");
      process.exit(1);
    }
  }
}

function getConfigPath() {
  var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  return path.join(home, "azure.iotz.config.json");
}

exports.readConfig = function readConfig() {
  try {
    if (!fs.existsSync(getConfigPath())) {
      // try to create config
      if (exports.updateConfig({}) != 0) return null;
    }
    var config = fs.readFileSync(getConfigPath()) + "";
    return JSON.parse(config);
  } catch(e) {
    console.log(" -", colors.red('error:'), e);
  }

  return null;
}

exports.updateConfig = function updateConfig(config) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config));
    return 0;
  } catch(e) {
    console.log(" -", colors.red('error:'), e);
  }

  return -1;
}

exports.getToolchain = function(name, silent) {
  var config = exports.readConfig();
  if (!config.hasOwnProperty('extensions')) {
    config.extensions = {}; // fake it. we need to create a local container anyways
  }

  if (config.extensions.hasOwnProperty(name)) {
    return name;
  } else {
    return exports.installToolchain(name, silent);
  }
}

exports.installToolchain = function(name, silent) {
  if (!fs.existsSync(__dirname, name)) {
    if (silent) return null;
    console.error(" -", colors.red('error:'), name, "is not available under the iotz extensions. update iotz?");
    process.exit(1);
  }

  var config = exports.readConfig();
  if (!config.hasOwnProperty('extensions')) {
    config.extensions = {}; // fake it. we need to create local container anyways
  }

  if (!config.extensions.hasOwnProperty(name)) {
    config.extensions[name] = {};
    exports.createLocalContainer(config);
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

  // recreate
  return exports.createLocalContainer();
}

// azureiot/iotz_local
// sync only
exports.createLocalContainer = function(config) {
  config = config ? config : exports.readConfig();
  if (!config.hasOwnProperty('extensions')) {
    config.extensions = {}; // fake it. we need to create local container anyways
  }

  // wipe the previous one (if there is)
  try {
    execSync('docker image rm -f azureiot/iotz_local 2>&1')
  } catch(e) { }

  var container_name = 'azureiot/iotz_local';
  var extensions = [];

  // TODO: order by installation date so we benefit from backward caching ?
  for (var name in config.extensions) {
    if (!config.extensions.hasOwnProperty(name)) continue;
    var rext = exports.requireExtension(name);
    extensions.push(rext.createExtension());
  }

  var libs = `
  FROM azureiot/iotz:latest

  WORKDIR /src

  RUN echo "Setting up ${container_name}"
  ${extensions.join('\n')}
  `;

  console.log(" -", colors.green('updating the local environment.'), "hopefully this will be quick.");
  fs.writeFileSync(path.join(__dirname, 'Dockerfile'), libs);

  var batchString = `docker build . --force-rm -t ${container_name}`;
  execSync(`cd ${__dirname} && ` + batchString, {stdio:[2]});
};

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

  var detected = null;
  for (var name in exts) {
    if (!exts.hasOwnProperty(name)) continue;
    var dd = exports.requireExtension(name).detectProject(compile_path, runCmd, command);
    if (dd) {
      if (detected) {
        console.error(" -", colors.red('error:'), "more than one extensions detected this folder as their type.");
        console.error(" -", "please define the toolchain and target under iotz.json file manually.");
        process.exit(1)
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