// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const fs     = require('fs');
const path   = require('path');
const rimraf = require('rimraf');
const exec       = require('child_process').exec;
const execSync   = require('child_process').execSync;
const extensions = require('../extensions/index.js');

function getProjectConfig(args, compile_path) {
  var proj_path = path.join(compile_path, "iotz.json");
  var config = null;
  try {
    config = JSON.parse(fs.readFileSync(proj_path) + "");
  } catch(e) { }

  var command = args.getCommand();
  var runCmd = args.get(command);
  var config_detected = extensions.detectProject(compile_path, runCmd, command);
  var updateConfig = false;

  if (!config) {
    config = config_detected;
    updateConfig = true;
  } else if (!config.toolchain) {
    if (config_detected && config_detected.toolchain) {
      config.toolchain = config_detected.toolchain;
      updateConfig = true;
    }
  }

  if (updateConfig && config) {
    try {
      fs.writeFileSync(path.join(compile_path, 'iotz.json'), JSON.stringify(config));
    } catch (e) {
      // this is not a must step hence (although weird but) skip if we don't have write access.
      console.error(' -', colors.yellow('warning:'), "couldn't update iotz.json file.");
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

  // do we have the project container
  if (images.indexOf(container_name) == -1 || command == 'init') {
    if (command == 'connect') {
      console.error(" -", colors.red('error:'), "there wasn't any project 'initialized' on this path.");
      console.error('  ', "try 'iotz init' ?");
      process.exit(1);
    }

    var ret;
    var config   = getProjectConfig(args, compile_path);
    var hostBase = 'default';

    if (config) {
      if (!config.toolchain) {
        console.error(" -", colors.red('warning:'), "no 'toolchain' is defined under iotz.json.");
      } else {
        if (command != 'init') {
          console.log(" -", colors.yellow('initializing the base container..'));
        }
        var tc = extensions.getToolchain(config.toolchain);
        ret = extensions.requireExtension(tc)
          .buildCommands(config, runCmd, 'localFolderContainerConstructer', compile_path);

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
    var subProcess = exec(`cd ${compile_path} && ` + batchString);
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
function runCommand(args, compile_path, runCmd, callback) {
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

  var pathName = path.basename(compile_path);
  var mountPath = (compile_path && compile_path.length) ? path.join(compile_path, '..') : compile_path;

  var batchString = `\
cd ${compile_path} && \
docker run --rm --name ${active_instance} -t -v \
"${mountPath}":/src:rw,cached \
-w /src/${pathName} ${container_name} \
/bin/bash -c "${runCmd}"\
`;

  var prc = exec(batchString, {stdio:'inherit', maxBuffer: 1024 * 8192}, function(err) {
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
    // make sure container will stop
    try {
      execSync(`docker kill ${active_instance} 2>&1`);
    } catch(e) { }
  }
  process.exit();
});

exports.cleanCommon = function(compile_path) {
  var ino = fs.statSync(compile_path).ino;
  var container_name = "aiot_iotz_" + ino;
  try {
    // clean up the previously stopped instance
    execSync(`docker image rm -f ${container_name} 2>&1`);
  } catch(e) { }
  console.log(' -', colors.green('container is deleted'));
};

exports.runCommand = function(args, compile_path) {
  var command = args.getCommand();
  var config = getProjectConfig(args, compile_path)

  createImage(args, compile_path, config, function(errorCode) {
    var runCmd = args.get(command);

    switch(command) {
      case "init":
      case "compile":
      case "clean":
      case "export":
      {
        if (command == 'init' && process.platform === "win32") {
          // TODO: detect this and behave accordingly?
          console.log(colors.yellow('Please ensure you have shared the current drive on Docker for Windows'));
        }

        if (!config) {
          if (command == 'clean') {
            exports.cleanCommon(compile_path);
            return;
          }

          console.error(" -", colors.red('error :'), "iotz.json file is needed. try 'iotz help'");
          process.exit(1);
        }

        if (!config.hasOwnProperty('toolchain')) {
          if (command == 'clean') {
            exports.cleanCommon(compile_path);
            return;
          }
          console.error(' - error:', colors.red('no toolchain is defined. i.e. "toolchain":"arduino" or "toolchain":"mbed" etc..'));
          process.exit(1);
        }

        var ret;
        try {
          ret = extensions.requireExtension(extensions.getToolchain(config.toolchain))
                .buildCommands(config, runCmd, command, compile_path);
        } catch(e) {
          console.error(' - error:', "something bad happened..\n", colors.red(e.message ? e.message : e));
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
        var name = path.basename(compile_path);
        // actual mount path is level - 1
        var mountPath = (compile_path && compile_path.length) ? path.join(compile_path, '..') : compile_path;
        execSync(`docker run -ti -v ${mountPath}:/src -w /src/${name} ${runCmd} ${container_name}`, {stdio:[0,1,2]});
        process.exit(0);
      }
      break;
      case "make":
        runCmd = command + " " + (runCmd != -1 ? runCmd : "");
        break;
      default:
        if (extensions.getToolchain(command) == command) {
          runCmd = extensions.requireExtension(command)
                   .selfCall(config, runCmd, command, compile_path);
        } else {
          console.error(" - error:", colors.red('unknown command'), command, compile_path);
          process.exit(1);
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

    runCommand(args, compile_path, runCmd, function(err) {
      if (err) {
        if (typeof err.message === "string" && err.message.indexOf("Command failed") < 0) {
          console.error(" -", colors.magenta('message'), err.message);
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
    })
  });
} // mbedBuild
