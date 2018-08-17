### iotz - iot easy

#### a containerized and extendible cross compiler box for arduino, arm mbed, raspberry pi and ... more

**reason** : IOT compiler toolchains have varying interfaces and designs.
Cross compiler tools are `mostly` platform specific.

**motto** : Improve developer productivity by making cross compile process easy. Also, help
toolchain developer to focus on a single base target (iotz base container)

**status** : It works generally but need more work to cover more platforms :)
Possibly have some bugs too. If it doesn't work for you, create an issue please. (seriously!)

**thanks** : `iotz` is a wrapper for other compiler toolchains. We appreciate the
amazing work is being done by ARM mbed-cli, Arduino tools, Docker, GNU GCC, 
Raspberry Pi tools, and many other tools, frameworks and libraries.

### See it in action ?

![ARM mbed demo](contents/demo.gif)

### Requirement

Install [Docker](https://docs.docker.com/install/) for your OS.

### How to install

```
npm install -g iotz
```

### Usage

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

### Commands

#### help
Display available options

#### version
Show version (semver)

#### update
Update base container to latest and re-install extensions on top of it.
If there is a container associated with the current folder, delete that.

You may re-install `iotz` via `npm install -g iotz` to get latest changes.

#### clean
Deletes the local container for the current path. Also, cleans up the auto
generated files and folders.

#### compile
Compile the project on given path (may need an `iotz.json` on path)

`compile` triggers a set of platform specific commands to build the project on the path.
Thus, it requires `target` and `toolchain` are defined under `iotz.json` file.

A successful `init` phase (see above) will ensure that you have `iotz.json` file in place.

! Some platforms (extensions) do not require a particular target hence you won't see
issue by not having an `iotz.json` file in place.

#### connect
`connect <additional args for docker>`

Runs the current container bash in an interactive mode (tty is enabled).
Current path is attached by default.

#### create
`create <toolchain name> <board name> <optional project name>`

Creates an empty project for given `toolchain` and `board`.

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

#### export
Exports a makefile (depends to extension)

#### init
`init <optional target board name>`

Initialize a specialized sandbox for current path.

In order to make things lite and performant, `iotz` initialize a specialized
container per project. `init` phase is required for specialization. Also, iotz
detects the extension required for the project during this phase and installs
accordingly.

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

### Extensions

How to develop an `iotz` extension and some other details are given [here](extensions/README.md)

### iotz.json file

Although introducing a yet another project file is not desirable, it helps to do things
easier for some folks and might help to create a better centralized experience.

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

*WARNING:* `deps` names are case sensitive

`toolchain`: name of the extension. i.e. `arduino` or `mbed` or anything else!

`target`: target device name. see [board names](#where-can-i-find-the-target-board-names)

`deps`: array of `{name, url}` pairs to defined dependencies

`filename`: main source code filename.

*Depending to extension, you might have other required definitions.*

### F.A.Q

#### Where can I find the target Board Names

We can't help you will all :) but we may show you the ones we know!

`ARM mbed` target names are available from `https://os.mbed.com/`. Simply find
your board there and on the same page you will find the `TARGET NAME` for that board.

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

`iotz` arduino extension helps with the names. i.e. `iotz init mxchip` is sufficient instead
of `iotz init MXCHIP_AZ3166`

#### How your project folder structure should look like?

However the folder structure was for ARMmbed or Arduino.. Keep it the same!
If you are just starting and don't have a particular structure, please visit
their websites and see the sample projects.

You might also visit `test/` folder and see what we did. Also, check `run.batch`
for the commands we do run.

#### How containers are managed ?

`iotz` creates a sub container that is tailored for your project and depend on
`azureiot/iotz` container.

In order to benefit from docker caching, name approach below is used.

`aiot_iotz_` `folder_ino`

i.e. `aiot_iotz_7396162`

#### How should I clean up the containers ?

Try pruning! -> https://docs.docker.com/config/pruning/

#### Unable to find `mbed` or `arduino` or `arm-linux-gnueabihf-g++` ....

Probably you did trigger the base container update on another folder and you just
need to update on the project folder to reset things up.

Try `iotz update` and / or `iotz clean`

#### open preproc/ctags_target_for_gcc_minus_e.cpp: no such file or directory

Try `iotz clean` and then compile again

### Contributing

Please run the tests under the `test` folder and see if your changes are okay!

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

### Reporting Security Issues

Security issues and bugs should be reported privately, via email, to the Microsoft
Security Response Center (MSRC) at [secure@microsoft.com](mailto:secure@microsoft.com).
You should receive a response within 24 hours. If for some reason you do not,
please follow up via email to ensure we received your original message. Further
information, including the [MSRC PGP](https://technet.microsoft.com/en-us/security/dn606155)
key, can be found in the [Security TechCenter](https://technet.microsoft.com/en-us/security/default).

### LICENSE

MIT
