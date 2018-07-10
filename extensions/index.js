// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const execSync = require('child_process').execSync;
const colors = require('colors/safe');

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
    config.extensions = {}; // fake it. we need to create local container anyways
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
  for (var name in config.extensions) {
    if (!config.extensions.hasOwnProperty(name)) continue;
    var rext;
    try {
      rext = require(`./${name}/index.js`);
    } catch(e) {
      console.error(" -", colors.red("error:"), `couldn't find a command '${name}'. Try with`, colors.yellow(`iotz run ${name}`), 'instead?');
      process.exit(1);
    }
    extensions.push(rext.createExtensions());
  }

  var libs = `
  FROM azureiot/iotz:latest

  WORKDIR /src/program

  RUN echo "Setting up ${container_name}"
  ${extensions.join('\n')}
  `;

  console.log(" -", colors.green('updating the local environment.'), "hopefully this will be quick.");
  fs.writeFileSync(path.join(__dirname, 'Dockerfile'), libs);

  var batchString = `docker build . --force-rm -t ${container_name}`;
  execSync(`cd ${__dirname} && ` + batchString, {stdio:[2]});
};

exports.autoDetectToolchain = function autoDetectToolchain(compile_path) {
  var config = exports.readConfig();
  if (!config.hasOwnProperty('extensions')) {
    return null;
  }

  for (var name in config.extensions) {
    if (!config.extensions.hasOwnProperty(name)) continue;
    if (require(`./${name}/index.js`).detectProject(compile_path)) {
      var pc = {
        "toolchain" : name
      };
      fs.writeFileSync(path.join(compile_path, 'iotz.json'), JSON.stringify(pc));
      return pc;
    }
  }

  return null;
}