## iotz - compile things easy

**DISCLAIMER**: I use this project for my day to day stuff and I know few other folks do the same.
Concerned or have an idea? be vocal and create an issue.

### in action

![ARM mbed demo](contents/demo.gif)

### requirements

Install [Node.js](https://nodejs.org/en/download/) 8+ and [Docker](https://docs.docker.com/install/).

!! if you are on Windows, use Linux containers and share the C drive from settings.

### how to install

```
npm i iotz -g
```

```
iotz update
```

*You may need `sudo` to run the update command. Try without `sudo` first*

### usage

```
usage: iotz <command> [options]
```

A quick start with an `Arduino` mxchip project

```
iotz create arduino mxchip myproject
cd myproject
iotz init
iotz compile
```

or a `Raspberry Pi` project

```
iotz create raspberry hello
cd hello
iotz init
iotz make
```

Alternatively, you might download an online Arduino, ARMmbed, Micropython, Raspberry Pi etc.
sample and build it as we did with the tests / examples under [test/](test/)

see [extensions and how things work](extensions/README.md)

The documentation below, applies to all extensions. However, you may find some extension
specific details under their README. i.e. [arduino](extensions/arduino/README.md)
[mbed](extensions/mbed/README.md) [raspberry](extensions/raspberry/README.md)

### commands

#### help
Display available options

#### version
Show version (semver)

#### update
Update base container to latest (from Docker registry) and re-install extensions on top of it.
If there is a container associated with the current folder, delete that. (force update)

You may re-install `iotz` via `npm install -g iotz` to get latest changes. Post
install process will automaticall call `update` command.

#### clean
Deletes the local container for the current path. Also, cleans up the auto
generated files and folders.

#### compile
Compile the project on given path (may need an `iotz.json` on path)

`compile` triggers a set of platform specific commands to build the project on the path.
Thus, it may require both `target` and `toolchain` are defined under `iotz.json` file.

A successful `init` phase (see below) will ensure that you have `iotz.json` file in place.

_Some platforms (extensions) do not require a particular target hence you won't see_
_issue by not having an `iotz.json` file in place._

#### connect
`connect <additional args for docker>`

Runs the current container bash in an interactive mode (tty is enabled).
`../<current path>` is attached by default.

#### create
`create <toolchain name> <board name> <optional project name>`

Creates an empty project for given `toolchain` and optinally `board`.

i.e.
```
iotz create arduino yun
```

The command above will create a `sampleApplication.ino` file and `iotz.json` config
file on the current folder. If you give a project name as shown below;

```
iotz create arduino yun new_project
```

This will create a folder named `new_project` and put the code and config file under it.

`<toolchain name>` is the name of extension. i.e. `arduino`, `mbed`, `raspberry`...
You may find the `<board name>`from [here](#where-can-i-find-the-target-board-names)

Once creation is done, you need to call `iotz init` on the target project folder
to setup the specialized container.

#### export
Exports a makefile (depends to extension)

#### init
`init <optional target board name>`

Initialize a specialized container for current path.

`iotz` initializes a specialized container per project. `init` phase is required
for specialization. `iotz` detects the extension required for the project
during this phase and installs as defined by the extension itself.

Beware. If you have previously initialized `iotz` for a project (path), once you
call it again, it will clean up the previous initialization.

#### run
`run <cmd> <args>`

Runs the `<cmd>` on container's bash.

i.e. `iotz run ls -l`

#### apt / apt-get / pip / npm
Use package managers. i.e. `apt-get install -y wget` would add `wget` into the current container.

`iotz` runs on top of Docker containers. As a result, your scripts won't change the
container. i.e. `iotz run apt install -y wget` will work but once the execution is complete,
container will be back to its' original state. So, if you want to add packages into actual
image, use the commands `apt`, `apt-get`, `pip`, `npm` directly.

P.S. Use `-y` with `apt` and `apt-get`
P.S. `npm` is not available by default but once you install `node` package via `apt`, `npm` command will
update the container image going forward.

### predefined extensions
```
  arduino <args>                           :  run arduino cli with given args
  make <args>                              :  run make command
  mbed <args>                              :  run mbed cli with given args
  raspberry                                :  shows make, cmake, and gcc gnuhf versions
  micropython
```

### other examples
```
  run:
    iotz run ls -l
  make:
    iotz make
  mbed:
    iotz mbed target -S
  arduino:
    iotz arduino --install-boards AZ3166:stm32f4
```

### iotz.json file

Introducing a yet another project file is not desirable. Yet, a basic configuration
is needed to keep toolchain user from repeating entries.

A basic `iotz.json` file for mxchip AZ3166
```
{
  "toolchain": "arduino",
  "target": "mxchip",
  "filename": "sample.ino"
}
```

mbed nucleo l476rg with a lib
```
{
  "toolchain": "mbed",
  "target": "nucleo_l476rg",
  "deps":
  [
    {
      "name": "NDefLib",
      "url" : "https://developer.mbed.org/teams/ST/code/NDefLib/#31f727872290"
    }
  ]
}
```

*WARNING:* `deps` names are case sensitive (and optional)

`toolchain`: name of the extension. i.e. `arduino` or `mbed` or anything else!

`target`: target device name. see [board names](#where-can-i-find-the-target-board-names)

`deps`: array of `{name, url}` pairs to defined dependencies

`filename`: main source code filename.

`mountConfig`: By default, iotz mounts from `../`. If depth of the current path is
3 or more folders, iotz mounts from `../..`. This approach may not fit for all. So,
you may use `mountConfig` to define a _relative_ mount point manually. i.e. `"mountConfig": "../build"`

_*_Depending to extension, you might have other required definitions._

### F.A.Q

#### How to update iotz?

```
npm i -g iotz
```

Once it's complete

```
iotz update
```

*You may need `sudo` to run the update command. Try without `sudo` first*

#### where can I find the target board names

`iotz` doesn't control the extensions and what targets those extensions support.
You will find a basic info below. Please check extension's page for better coverage.

`ARM mbed` target names are available from `https://os.mbed.com/`. Simply find
your board there. On the board page, you will find the `TARGET NAME` for that board.

`Arduino` target names might be a bit more tricky to find but the list below
should help for starters;

```
  AZ3166 MXCHIP_AZ3166 - arduino yun - arduino uno - arduino diecimila
  arduino nano - arduino mega - arduino megaADK - arduino leonardo - arduino leonardoeth
  arduino micro - arduino esplora - arduino mini - arduino ethernet - arduino fio
  arduino bt - arduino pro - arduino atmegang - arduino robotControl - arduino robotMotor
  arduino gemma - arduino circuitplay32u4cat - arduino yunmini - arduino chiwawa - arduino one
  arduino unowifi - esp8266 generic - esp8266 esp8285 - esp8266 espduino - esp8266 huzzah
  esp8266 espresso_lite_v1 - esp8266 espresso_lite_v2 - esp8266 phoenix_v1 - esp8266 phoenix_v2 - esp8266 nodemcu
  esp8266 nodemcuv2 - esp8266 modwifi - esp8266 thing - esp8266 thingdev - esp8266 esp210
  esp8266 d1_mini - esp8266 d1_mini_pro - esp8266 d1_mini_lite - esp8266 d1 - esp8266 espino
  esp8266 espinotee - esp8266 wifinfo - esp8266 arduino-esp8266 - esp8266 gen4iod - esp8266 oak
```

`iotz` arduino extension helps with the names. i.e. `iotz init arduino mxchip` is sufficient instead
of `iotz init arduino MXCHIP_AZ3166`

#### how your project folder structure should look like?

Similar to folder structure for ARMmbed or Arduino or other.. Keep it the same!
If you are just starting and don't have a particular structure, please visit
their websites and see the sample projects.

You might also visit `test/` folder and see by yourself. Also, see `run.batch`
for the test commands.

#### how containers are managed ?

`iotz` creates a sub container that is tailored for your project and depend on
`azureiot/iotz` container.

In order to benefit from docker caching, below naming is used.

`aiot_iotz_` `folder_ino`

i.e. `aiot_iotz_7396162`

more info is available [here](extensions/README.md)

#### how should I clean up the containers ?

Try pruning! -> https://docs.docker.com/config/pruning/

#### unable to find `mbed` or `arduino` or `arm-linux-gnueabihf-g++` ....

Update might possibly fix it.

Try `iotz update` and / or `iotz clean`

#### open preproc/ctags_target_for_gcc_minus_e.cpp: no such file or directory

Try `iotz clean` and then compile again

### roadmap

See active list of [features](https://github.com/Azure/iotz/issues?q=is%3Aissue+is%3Aopen+label%3Afeature) under development.

### contributing

Please test the changes and code style (eslint) prior to sending a PR. (Running the tests may take some serious amount of time and your network traffic.)

```
cd test && node runtests.js
```


### LICENSE

MIT
