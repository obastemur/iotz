## iotz - compile things easy

[![Join the chat at https://gitter.im/Microsoft/iotz](https://badges.gitter.im/Microsoft/iotz.svg)](https://gitter.im/Microsoft/iotz?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Licensed under the MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/Azure/iotz/blob/master/LICENSE.md)

**iotz** is an extension based containerized wrapper for other iot compiler toolchains.
There are many toolchains with specific needs and way of using. We developed this
experimental tool to make compiling things easier.

-	cross compiling tools are mostly platform specific (and sometimes hard to setup thoroughly)
-	the tools may not be available on user's favorite OS (or may have a platform specific bug(s)/inconsistencies)
-	toolchains or their dependencies sometimes don't play well with each other on the same user host system.
-	there are many platforms for iot toolchain developers to target.
-	reproducing build reliability across systems is not easy.
-	higher entry level for a device framework / tooling
-	advanced users might still need a transparent way to reach actual sub framework
-	some platforms already benefit the pre-built docker containers as a build environment

`iotz`;
-	tries to answer the problems above
-	provides a seamless interface for iot and cross platform toolchains.
-	provides an external extension support, so anyone (big or small) can attach their platform freely
-	doesn't provide any toolchain by itself. (extension can add commands or define the behavior for pre-exist commands)

_It is in an early phase hence both feedback and contributions are appreciated_

**deep down** >
see [extensions and how things work](extensions/README.md)

**thanks** >
We appreciate the amazing work that is being done by ARM mbed-cli, Arduino tools,
Docker, GNU GCC, Raspberry Pi tools, and many other tools, frameworks and libraries.

### see it in action ?

![ARM mbed demo](contents/demo.gif)

### requirements

Install [Node.js](https://nodejs.org/en/download/) and [Docker](https://docs.docker.com/install/).

### how to install

```
npm i iotz -g
```

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

Alternatively, you might download an online Arduino, ARMmbed, Raspberry Pi etc.
sample and build it as we did with the tests / examples under [test/](test/)

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

### predefined extensions
```
  arduino <args>                           :  run arduino cli with given args
  make <args>                              :  run make command
  mbed <args>                              :  run mbed cli with given args
  raspberry                                :  shows make, cmake, and gcc gnuhf versions
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

_*_Depending to extension, you might have other required definitions._

### F.A.Q

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

However the folder structure was for ARMmbed or Arduino or other.. Keep it the same!
If you are just starting and don't have a particular structure, please visit
their websites and see the sample projects.

You might also visit `test/` folder and see what we did. Also, check `run.batch`
for the commands we run for tests.

#### how containers are managed ?

`iotz` creates a sub container that is tailored for your project and depend on
`azureiot/iotz` container.

In order to benefit from docker caching, name approach below is used.

`aiot_iotz_` `folder_ino`

i.e. `aiot_iotz_7396162`

more info is available [here](extensions/README.md)

#### how should I clean up the containers ?

Try pruning! -> https://docs.docker.com/config/pruning/

#### unable to find `mbed` or `arduino` or `arm-linux-gnueabihf-g++` ....

Probably you did trigger the base container update on another folder and you just
need to update on the project folder to reset things up.

Try `iotz update` and / or `iotz clean`

#### open preproc/ctags_target_for_gcc_minus_e.cpp: no such file or directory

Try `iotz clean` and then compile again

### roadmap

See active list of [features](https://github.com/Azure/iotz/issues?q=is%3Aissue+is%3Aopen+label%3Afeature) under development.

### contributing

Please run the tests under the `test` folder and see if your changes are okay! (Running the tests may take some serious time and amount of your network traffic.)

```
cd test && node runtests.js
```

This project welcomes contributions and suggestions.  Most contributions require
you to agree to a Contributor License Agreement (CLA) declaring that you have the
right to, and actually do, grant us the rights to use your contribution. For details,
visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g., label, comment).
Simply follow the instructions provided by the bot. You will only need to do this
once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

### reporting security issues

Security issues and bugs should be reported privately, via email, to the Microsoft
Security Response Center (MSRC) at [secure@microsoft.com](mailto:secure@microsoft.com).
You should receive a response within 24 hours. If for some reason you do not,
please follow up via email to ensure we received your original message. Further
information, including the [MSRC PGP](https://technet.microsoft.com/en-us/security/dn606155)
key, can be found in the [Security TechCenter](https://technet.microsoft.com/en-us/security/default).

### LICENSE

MIT
