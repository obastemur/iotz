## how does it work?

**iotz**, brings a `Ubuntu` base image with most common dependencies are pre-installed.
That image is named/tagged as `azureiot/iotz`.

In order to explain things easier, lets assume that we want to develop an application for `Arduino Uno`
board using Arduino toolchain. In order to setup the environment, `iotz` expects us to execute `iotz init arduino uno`
under the project folder.

Once we do that, **iotz** will call `createExtension` function from `iotz` Arduino extension.
That function returns a set of docker specific commands to create a specialized arduino base container.
Eventually, we will find the container named as `azureiot/iotz_local_arduino`.
This specialized container image (fork from the base image) has all the necessary tools to compile an Arduino project.

_Initial creation process for extension image may take time. However, it happens once (unless you force update them)._

Lets step back for a second and talk more about `iotz init arduino uno` call we made.
Assuming, we executed that command under a project folder located at `pre_folder/app_folder/` path.
On the file system, that path has a unique id / inode number (locally unique).
**iotz** uses that unique id to create specific image for that folder only. (image is based on arduino base image)
If unique id for `pre_folder/app_folder/` path was `8595881942`, the final image name would be `aiot_iotz_8595881942`.

_Unless you list the docker container list manually, all the things mentioned above won't be visible to you._

Later calls to iotz (under the same path) will always resolve under the same container.
i.e. `iotz connect` under the same path will simply mount `pre_folder` on the same container named `aiot_iotz_8595881942`.
However, it will put you on the shell under the `pre_folder/app_folder` instead.
Mount location is predefined to `../<current path>` but the actual work path and unique id are set based on current path.

_please note; the path approach mentioned above is premature and will be configurable to suit more needs_

During the `init` step, `iotz` gathered everything it needs to setup the environment.
We have a configuration file that has been filled by `iotz` (iotz.json). So,
next time, we may just call `iotz init` and it will grab the rest from that file.
Finally, `iotz` created a specialized Docker image that is bound to our project folder (`aiot_iotz_8595881942`).

As a last step, we will execute `iotz compile`.  *iotz* will gather the `compile`
related set of commands from the Arduino extension and execute them on `aiot_iotz_8595881942`.

That's it!

Details for the extension template is given below.

_reminder; By default, iotz searches the extension under the official extensions_
_folder and then tries to require blindly. So, if you have published your iotz_
_extension to npm, the user should install that extension globally to make it available to iotz_

```
// meaning for some of the arguments below
// runCmd -> args after the command. i.e. -> iotz init mbed mxchip. -> runCmd == 'mbed mxchip'
// command -> the command itself. i.e. -> iotz init mbed mxchip -> command is 'init'
// project_path -> pwd (current path)

exports.detectProject = function(project_path, runCmd, command) {
  // return config file json or null based on whether the project on `project_path` is a
  // match to extension. If multiple extensions returns with a configuration. User has to set the
  // correct extension manually
}

// adds additional commands to local container project
// i.e. user already has a config file (iotz.json) on the current path with toolchain defined
exports.addFeatures = function(config, runCmd, command, compile_path) {
  if (command == "??????????") {
    return {
      run: "...", // commands to run
      calllback: null, // callback after exec
      commitChanges: false // update container with the changes. `run` must have docker commands
    }
  }
}

exports.selfCall = function(config, runCmd, command, compile_path) {
  // define the behavior for a named call
  // i.e. your extension name is `abc`
  // user might call `iotz abc`
  // what bash command you want to execute on the container?
  // check what we do with arduino, mbed, and raspberry-pi
}

exports.createExtension = function() {
  // what bash command you want to run on the container to prepare the environment
  // for your extension?
  return {
    run: // commands to run under Dockerfile
    callback: function()... optional callback to run after container is created
    commitChanges: false // update container with the changes. `run` must have docker commands
  }
}

exports.buildCommands = function(config, runCmd, command, compile_path, mount_path) {
  var callback = null;
  var runString = "";

    // define things to do for `init`, `localFolderContainerConstructer`, `clean`,
    // `compile`, and `export` commands
    // set bash stuff into `runString`
    // if you want to run any additional post init logic, set the callback = function(config)
    // `config` corresponds to `iotz.json` contents

  if (command == 'init') {
    // set init stuff here
  } else if (command == 'localFolderContainerConstructer') {
    // set localFolderContainerConstructer things here.
    // difference between `localFolderContainerConstructer` and `init` is.. `init` is a user command
    // `localFolderContainerConstructer` will be called no matter what and will be called
    // prior to `init`
  } else if (command == 'clean') {
    // set what to do for `clean`
  } else if (command == 'compile') {
    // things for `compile`
  } else if (command == 'export') {
    // things for `export`
  } else {
    console.error(" -", colors.red("error :"),
              "Unknown command", command);
    process.exit(1);
  }

  return {
    run: runString,
    callback: callback,
    commitChanges: false // update container with the changes. `run` must have docker commands
  };
}

exports.createProject = function createProject(compile_path, runCmd) {
  // create an empty project based on the information provided by user
}
```