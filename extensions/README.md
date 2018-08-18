## how it works

`iotz` is an extension based tool. In other words, iotz doesn't implement anything
or provide any toolchain or subsystem by itself. Extensions, define the behavior
for predefined commands. They may even expose their own set of commands.

`iotz` brings a specialized `ubuntu` based container with common build tools and system
libraries are installed. That's named as `azureiot/iotz`

Lets assume that you work with `arduino` toolchain and `uno` board.

Once you call `iotz init arduino uno`, iotz calls `createExtension` function from
`arduino` extension file. That function, returns the set of docker specific commands
to create a specialized `arduino` base container. Eventually, you will find that
container is named as `azureiot/iotz_local_arduino`

The base container creations may take time and happens once (unless you force update them)

Assuming you have called `iotz init arduino uno` under a folder `some_folder/app_folder/`.
That folder has a unique inode number and `iotz` uses that inode to fork the specialized
container for that folder only.

Lets say, the folder `pre_folder/app_folder/` has inode `8595881942`. Once `init` process is
completed, you will have a container with a name `aiot_iotz_8595881942` is created.
Unless you list the docker container list, all the things above won't be visible to you.

Later calls to `iotz` under the same folder will always resolve under the same container.
i.e. `iotz connect` under the same path will simply mount `pre_folder` on the same
container named `aiot_iotz_8595881942`. However, it will put you on the `shell`
under the `pre_folder/app_folder`. Mount location is always `../<current path>`
but the actual work folder and inode are set to current folder.

This way; you may work with `arduino` toolchain under `yourproject/arduino`
while enjoying `mbed` toolchain under `yourproject/mbed`

Please find the extension template below.

reminder; By default, iotz searches the extension under the official extensions
folder and then tries to `require` blindly. So, if you have published your `iotz`
extension to npm, user should install that extension globally to make it available to `iotz`

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
  }
}

exports.buildCommands = function(config, runCmd, command, compile_path) {
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
    callback: callback
  };
}

exports.createProject = function createProject(compile_path, runCmd) {
  // create an empty project based on the information provided by user
}
```