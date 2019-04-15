// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------
"use strict"

const colors = require('colors/safe');
const fs     = require('fs');
const path   = require('path');
const rimraf = require('rimraf');
const exec       = require('child_process').exec;
const execSync   = require('child_process').execSync;
const extensions = require('../extensions/index.js');
const isWindows = process.platform === "win32";

var FIX_PATH_CONTAINER = function(p) {
  if (isWindows) {
    return p.replace(/\\/g, "/");
  } else {
    return p;
  }
}

function getMountPath(config, compile_path) {
  var path_depth = compile_path.split(path.sep).length;
  var autoConfig = "..";
  if (path_depth >= 3) {
    autoConfig = ".." + path.sep + "..";
  }

  var mountConfig = config && config.mountConfig ? config.mountConfig : autoConfig;
  var mount_path = (compile_path && compile_path.length) ? path.join(compile_path, mountConfig) : compile_path;
  if (!fs.existsSync(mount_path)) {
    console.error(" - error:", `${mount_path} does not exist. Beware! you may not use iotz from a root folder`);
    process.exit(1);
  }

  if (isWindows) {
    mount_path = mount_path.replace("\\", "\\\\");
  }

  return mount_path;
}

function getProjectConfig(args, command, compile_path) {
  var proj_path = path.join(compile_path, "iotz.json");
  var config = null;
  try {
    config = JSON.parse(fs.readFileSync(proj_path) + "");
  } catch(e) { }

  if ((!config && command == 'clean') || command == 'create') {
    return null;
  }

  var command = args.getCommand();
  var runCmd = args.get(command);
  var config_detected;
  var updateConfig = false;

  if (!config || !config.toolchain || !config.target) {
    config_detected = extensions.detectProject(compile_path, runCmd, command);
    if (config_detected) {
      if (!config) {
        config = config_detected;
        updateConfig = true;
      } else if (!config.toolchain) {
        if (config_detected.toolchain) {
          config.toolchain = config_detected.toolchain;
          updateConfig = true;
        }
      } else if (!config.target) {
        if (config_detected.target) {
          config.target = config_detected.target;
          updateConfig = true;
        }
      }
    }
  }

  if (updateConfig && config) {
    try {
      fs.writeFileSync(path.join(compile_path, 'iotz.json'), JSON.stringify(config));
    } catch (e) {
      // this is not a must step hence (although weird but) skip if we don't have write access.
      console.error(' -', colors.bold('warning:'), "couldn't update iotz.json file.");
      console.error(' -', e.message);
    }
  }

  return config;
}

function createImage(args, compile_path, config, callback) {
  var images = execSync('docker images -a') + "";
  var ino = fs.statSync(compile_path).ino;
  var container_name = "aiot_iotz_" + ino;

  var command = args.getCommand();
  var runCmd = args.get(command);

  if (command == 'create') {
    callback(0);
    return;
  }

  if (command == 'clean' && !config) { // no config hence nothing further to clean
    callback(0);
    return;
  }

  // do we have the project container?
  if (images.indexOf(container_name) == -1 || command == 'init') {
    if (!images.indexOf(container_name)) {
      exports.cleanCommon(compile_path, 'init'); // force clean the previous one.
    }
    var ret;
    var config   = getProjectConfig(args, command, compile_path);
    var hostBase = 'default';
    runCmd = (runCmd == -1) ? "" : runCmd;

    if (config && command != 'connect') {
      if (!config.toolchain) {
        console.error(" -", colors.bold('warning:'), "no 'toolchain' is defined under iotz.json.");
      } else {
        if (command == 'clean') {
          callback(0);
          return;
        }
        if (command != 'init') {
          console.log(" -", colors.bold('initializing the base container..'));
        }
        var tc = extensions.getToolchain(config.toolchain);
        ret = extensions.requireExtension(tc)
          .buildCommands(config, runCmd, 'localFolderContainerConstructer', compile_path,
                         getMountPath(config, compile_path));

        if (ret && ret.run.length) {
          runCmd = "&& " + ret.run;
        }
        hostBase = tc;
      }
    }

    images = execSync('docker images -a') + "";
    // do we have the local container?
    if (images.indexOf(`azureiot/iotz_local_${hostBase}`) == -1) {
      extensions.createContainer(hostBase);
    }

    var libs = `
    FROM azureiot/iotz_local_${hostBase}

    WORKDIR /src

    RUN echo "Setting up ${container_name}" ${runCmd}`;
    fs.writeFileSync(path.join(compile_path, 'Dockerfile'), libs);

    var batchString = `docker build . --force-rm -t ${container_name}`;
    var subProcess = exec(`cd ${compile_path} && ` + batchString, {cwd:compile_path});
    subProcess.stderr.on('data', function (data) {
      process.stderr.write(data);
    });

    subProcess.on('exit', function(errorCode) {
      rimraf.sync(path.join(compile_path, 'Dockerfile'));
      if (ret && ret.callback) {
        ret.callback(config);
      }
      callback(errorCode, hostBase);
    });
  } else {
    callback(0);
  }
}

var active_instance = null;
function execCommand(args, compile_path, runCmd, config, callback, commitChanges) {
  if (!runCmd || runCmd.length == 0) {
    callback(0);
    return;
  }

  var ino = fs.statSync(compile_path).ino;
  var container_name = "aiot_iotz_" + ino;
  active_instance = container_name + "_";
  try {
    // clean up the previously stopped instance
    // TODO: configurable?
    execSync(`docker container rm -f "/${active_instance}" 2>&1`);
  } catch(e) { }

  var mount_path = getMountPath(config, compile_path);

  var batchString;

  if (commitChanges) {
    var libs = `
    FROM ${container_name}

    ${runCmd}
`;
    fs.writeFileSync(path.join(compile_path, container_name + '.Dockerfile'), libs);

    batchString = `docker build . -f ${container_name}.Dockerfile --force-rm -t ${container_name}`;
  } else {
    batchString = `\
cd ${compile_path} && \
docker run --rm --name ${active_instance} -t -v \
"${mount_path}":/src:rw,cached \
-w /src/${FIX_PATH_CONTAINER(path.relative(mount_path, compile_path))} ${container_name} \
/bin/bash -c "${runCmd}"\
`;
  }

  var prc = exec(batchString, {stdio:'inherit', maxBuffer: 1024 * 8192}, function(err) {
    if ((err + "").indexOf('Unable to find image') > 0) {
      console.log("\n -", colors.bold('image was already removed?'));
    }
    if (commitChanges) {
      rimraf.sync(path.join(compile_path, container_name + '.Dockerfile'));
    }
    callback(err);
  });
  prc.stderr.on('data', function (data) {
    process.stderr.write(data);
  });
  prc.stdout.on('data', function (data) {
    process.stdout.write(data);
  });
}

process.on('SIGINT', function() {
  if (active_instance) {
    // bad hack to make sure container will stop (so host OS don't overwrite the shared)
    try {
      execSync(`docker kill ${active_instance} 2>&1`);
    } catch(e) { }
  }
  process.exit();
});

exports.cleanCommon = function(compile_path, command) {
  var ino = fs.statSync(compile_path).ino;
  var container_name = "aiot_iotz_" + ino;
  try {
    // clean up the previously stopped instance
    execSync(`docker image rm -f ${container_name} 2>&1`);
  } catch(e) { }
  if (command != 'init') {
    console.log(' -', colors.bold('container is deleted'));
  }
};

var addFeatures = function(config, runCmd, command, compile_path) {
  if (command == "apt-get" || command == "apt" || command == "pip" || command == "npm") {
    return {
      run: "RUN " + command + " " + (runCmd != -1 ? runCmd : ""),
      callback: null,
      commitChanges: true
    }
  } else if (command == "make") {
    return {
      run: command + " " + (runCmd != -1 ? runCmd : ""),
      callback: null,
      commitChanges: false
    }
  }
}

exports.runCommand = function(args, compile_path) {
  var command = args.getCommand();
  var config = getProjectConfig(args, command, compile_path)

  createImage(args, compile_path, config, function(errorCode) {
    if (errorCode) {
      console.error(" - error:", "docker couldn't create an image for this path");
      process.exit(1);
    }

    var runCmd = args.get(command);
    config = getProjectConfig(args, command, compile_path);

    switch(command) {
      case "init":
      case "compile":
      case "clean":
      case "export":
      {
        if (isWindows && command == 'init') {
          // TODO: detect this and behave accordingly?
          console.log(colors.bold('Please ensure you have shared the current drive on Docker for Windows'));
        }

        if (!config) {
          if (command == 'clean' || command == 'init') {
            exports.cleanCommon(compile_path, command);
          }
          if (command == 'clean') {
            return;
          }

          // not detected. use default container.
          config = { toolchain: "default" };
        }

        var ret;
        try {
          ret = extensions.requireExtension(extensions.getToolchain(config.toolchain))
                .buildCommands(config, runCmd, command, compile_path, getMountPath(config, compile_path));
        } catch(e) {
          console.error(' - error:', "something bad happened..\n", colors.bold(e.message ? e.message : e));
          process.exit(1);
        }
      }
      break;
      case "create":
        extensions.createProject(compile_path, runCmd);
        process.exit(0);
      case "run": // do nothing
      break;
      case "connect":
      {
        var ino = fs.statSync(compile_path).ino;
        var container_name = "aiot_iotz_" + ino;
        if (runCmd == -1) runCmd = "";
        var mount_path = getMountPath(config, compile_path);
        try {
          execSync(`docker run -ti -v ${mount_path
}:/src -w /src/${FIX_PATH_CONTAINER(path.relative(mount_path, compile_path))
} ${runCmd} ${container_name}`, {stdio:[0,1,2]});
        } catch(e) { /* noop */ }
        process.exit(0);
      }
      break;
      default:
        ret = addFeatures(config, runCmd, command, compile_path);
        if (!ret) {
          if (config && config.toolchain) {
            if (extensions.getToolchain(config.toolchain) == config.toolchain) {
              ret = extensions.requireExtension(config.toolchain)
                    .addFeatures(config, runCmd, command, compile_path);
            }
            if (!ret || !ret.run) {
              console.error(` - error: you should provide a command to run. Unknown command "${command}".`);
              process.exit(1);
            }
          } else if (extensions.getToolchain(command) == command) {
            runCmd = extensions.requireExtension(command)
                    .selfCall(config, runCmd, command, compile_path);
          } else {
            console.error(" - error:", colors.bold("unknown command"), command, compile_path);
            process.exit(1);
          }
        }
    };

    if (ret && typeof ret.run === 'string') {
      runCmd = ret.run;
    }

    if (runCmd === -1) {
      console.error(` - error: you should provide a command to run after "${command}".`);
      errorCode = errorCode ? errorCode : 1;
    }

    if (errorCode) {
      process.exit(errorCode);
      return;
    }

    var commitChanges = ret && ret.commitChanges ? true : false;
    execCommand(args, compile_path, runCmd, config, function(err) {
      if (err) {
        if (typeof err.message === "string" && err.message.indexOf("Command failed") < 0) {
          console.error(" -", colors.bold('message'), err.message);
        }
        process.exit(1);
        return;
      }
      if (ret && ret.callback) {
        ret.callback(config);
      }
      if (command == 'clean') {
        exports.cleanCommon(compile_path);
      }
    }, commitChanges)
  });
}