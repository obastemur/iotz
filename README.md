### iotz - iot easy

#### a containerized and extendible cross compiler box for arduino, arm mbed, raspberry pi and ... more

**reason** : IOT compiler toolchains have many moving parts and configurations.
Cross compiler tools are `mostly` platform specific.

**motto** : Improve developer productivity by providing all the cross compiler
capabilities on user's favorite OS. Make installation and usage painless.

**status** : It works generally but need more work to cover more platforms :)
If it doesn't work for you, create an issue please. (seriously!)

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

A quick start with an Arduino mxchip project

```
iotz create arduino mxchip myproject
cd myproject
iotz compile
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

#### init
`init <optional target board name>`

Initialize a specialized sandbox for current path.

In order to make things lite and performant, `iotz` initialize a specialized
container per project. `init` phase is required for specialization. Also, iotz
detects the extension required for the project during this phase and installs
accordingly.

Beware. If you have previously initialized `iotz` for a project (path), once you
call it again, it will clean up the previous initialization.

#### compile
Compile the project on given path (may need an `iotz.json` on path)

`compile` triggers a set of platform specific commands to build the project on the path.
Thus, it requires `target` and `toolchain` are defined under `iotz.json` file.

A successful `init` phase (see above) will ensure that you have `iotz.json` file in place.

! Some platforms (extensions) do not require a particular target hence you won't see
issue by not having an `iotz.json` file in place.

#### clean
Deletes the local container for the current path. Also, cleans up the auto
generated files and folders.

#### run
`run <cmd> <args>`

Runs the `<cmd>` on container's bash.

i.e. `iotz run ls -l`

#### export
Exports a makefile (depends to extension)

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

### Thanks
`iotz` works on top of other compiler toolchains. We appreciate the
amazing work is being done by ARM mbed-cli, Arduino tools, Docker, GNU GCC cross
compiler, Raspberry Pi tools, and many other tools, frameworks and libraries.

### F.A.Q

#### Where can I find the target Board Names

We can't help you will all :) but we may show you the ones we know!

`ARM mbed` target names are available from `https://os.mbed.com/`. Simply find
your board there and on the same page you will find the `TARGET NAME` for that board.

`Arduino` target names might be a bit more tricky to find but the list below
should help for starters;

```
arduino:avr:uno
arduino:avr:yun
arduino:avr:diecimila
arduino:avr:nano
arduino:avr:mega
arduino:avr:megaADK
arduino:avr:leonardo
arduino:avr:micro
arduino:avr:esplora
arduino:avr:mini
arduino:avr:ethernet
arduino:avr:fio
arduino:avr:bt
arduino:avr:LilyPadUSB
arduino:avr:lilypad
arduino:avr:pro
arduino:avr:atmegang
arduino:avr:robotControl
arduino:avr:robotMotor
arduino:sam:arduino_due_x_dbg
arduino:sam:arduino_due_x
arduino:avr:tinyg
```

MXCHIP AZ3166
```
AZ3166:stm32f4:MXCHIP_AZ3166
```

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

Try `iotz update` or.. if you have `iotz.json` file, `iotz clean`

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