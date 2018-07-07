// ----------------------------------------------------------------------------
//  Copyright (C) Microsoft. All rights reserved.
//  Licensed under the MIT license.
// ----------------------------------------------------------------------------

const colors = require('colors/safe');
const fs     = require('fs');
const path   = require('path');
const cmd    = require('node-cmd');
const rimraf = require('rimraf');
const execSync = require('child_process').execSync;

function createImage(args, compile_path, config, callback) {
  var images = execSync('docker images -a');
  var ino = fs.statSync(compile_path).ino;
  var container_name = "aiot_iotc_" + ino;

  if (images.indexOf(container_name) == -1) {
    console.log(" - ", colors.yellow('creating the container for the first use..'));

    var proj_path = path.join(compile_path, "iotc.json");
    var config = null;
    var runCmd = "";

    try {
      config = JSON.parse(fs.readFileSync(proj_path) + "");
    } catch(e) { }

    var ret;
    if (config) {
      switch (config.toolchain) {
        case "arduino":
        case "mbed":
          ret = require('./' + config.toolchain).build(config, runCmd, 'container_init', compile_path);
          if (ret && ret.run.length) {
            runCmd = "&& " + ret.run;
          }
          break;
        default:
          console.error(' - error:', colors.red('unsupported toolchain'), config.target);
          process.exit(1);
      };
    }

    var libs = `
    FROM azureiot/iotc:latest

    WORKDIR /src/program

    RUN echo "Setting up ${container_name}" ${runCmd}`;
    fs.writeFileSync(path.join(compile_path, 'Dockerfile'), libs);

    var batchString = `docker build . --force-rm -t ${container_name}`;
    var subProcess = cmd.get(`cd ${compile_path} && ` + batchString);

    subProcess.stderr.pipe(process.stderr);
    subProcess.stdin.pipe(process.stdin);

    subProcess.on('exit', function(errorCode) {
      rimraf.sync(path.join(compile_path, 'Dockerfile'));
      if (ret && ret.callback) {
        ret.callback(config);
      }
      callback(errorCode);
    });
  } else {
    callback(0);
  }
}

var active_instance = null;
function runCommand(args, compile_path, CMD, callback) {
  var ino = fs.statSync(compile_path).ino;
  var container_name = "aiot_iotc_" + ino;
  active_instance = container_name + "_";
  try {
    // clean up the previously stopped instance
    execSync(`docker container rm -f "/${active_instance}" 2>&1`);
  } catch(e) { }

  var batchString = `\
docker run --rm --name ${active_instance} -t --volume \
${compile_path}:/src/program:rw,cached ${container_name} /bin/bash -c "${CMD}"\
`;

  var subProcess = cmd.get(`cd ${compile_path} && ${batchString}`);
  subProcess.stdout.pipe(process.stdout);
  subProcess.stderr.pipe(process.stderr);
  subProcess.stdin.pipe(process.stdin);

  subProcess.on('exit', function(errorCode) {
    callback(errorCode);
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

exports.build = function makeBuild(args, compile_path) {
  var proj_path = path.join(compile_path, "iotc.json");
  var command = args.getCommand();
  var config;
  try {
    config = JSON.parse(fs.readFileSync(proj_path) + "");
  } catch(e) {
    if (command == 'init') {
      console.error(" - ", colors.red('error :'), "iotc.json file is needed. try 'iotc help'");
      process.exit(1);
    }
    config = null;
  }

  createImage(args, compile_path, config, function(errorCode) {
    var runCmd = args.get(command);

    switch(command) {
      case "init":
      case "compile":
      case "clean":
      case "export":
      {
        if (command == 'init' && process.platform === "win32") {
          console.log(colors.yellow('Have you shared the current drive on Docker for Windows?'));
        }
        var ret;
        var proj_path = path.join(compile_path, "iotc.json");
        try {
          if (!config) config = JSON.parse(fs.readFileSync(proj_path) + "");
          if (!config.hasOwnProperty('toolchain')) {
            console.error(' - error:', colors.red('no toolchain is defined. set "toolchain":"arduino" or "toolchain":"mbed"'));
            process.exit(1);
          }
          switch (config.toolchain) {
            case "arduino":
            case "mbed":
              ret = require('./' + config.toolchain).build(config, runCmd, command, compile_path);
              break;
            default:
              console.error(' - error:', colors.red('unsupported toolchain'), config.target);
              process.exit(1);
          };
        } catch(e) {
          console.error(' - error:', "something bad happened..\n", colors.red(e));
          process.exit(1);
        }
      }
      break;
      case "run": // do nothing
      break;
      case "mbed":
      case "arduino":
        if (runCmd !== -1) {
          runCmd = command + " " + runCmd;
        }
      break;
      case "make":
        runCmd = command + " " + (runCmd != -1 ? runCmd : "");
        break;
      default:
        console.error(" - error:", colors.red('unknown command'), command, compile_path);
        process.exit(1);
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

    runCommand(args, compile_path, runCmd, function(errorCode) {
      if (errorCode) {
        process.exit(errorCode);
        return;
      }
      if (ret && ret.callback) {
        ret.callback(config);
      }
    })
  });
} // mbedBuild