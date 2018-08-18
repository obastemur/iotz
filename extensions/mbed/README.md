### iotz - mbed

**lets try**

You may
- download a sample project from [mbed OS examples](https://os.mbed.com/teams/mbed-os-examples/code/)
- create a new mbed `hello-world` project?

So;

- If you want to go with download option;
i.e. download [this sample project](https://os.mbed.com/teams/mbed-os-examples/code/mbed-os-example-blinky/).
Once you are done, browse extracted folder with your favorite terminal app. It
is time to prepare the environment for `DISCO_L475VG_IOT01A` dev board.
```
iotz init mbed DISCO_L475VG_IOT01A
```

- If you want to create one from scratch;
```
iotz create mbed DISCO_L475VG_IOT01A hello
cd hello
iotz init
```

**lets compile!**

Regardless what you did above, it is time to build your project.
```
iotz compile
```

That's it! The binary you need is under `BUILD/` folder.
Flash that binary into your board and you are all set.

You could also export a `Makefile` and use that
```
iotz export
```

Now you have the `Makefile`. So, lets use it.
```
iotz make -j2
```
p.s. `-j` sometimes don't play well under docker

### Use mbed cli directly?

try `iotz mbed`!

### What should I use instead of mbed_app.json configuration files?

iotz doesn't shadow the extensions. However you were using it before, use it
similarly. If you want to merge it with `iotz.json` file, you may also define it
as shown below;

```
{
  ..other configuration
  .
  .
  "mbed_app.json" : < put configuration here >
}
```

Documentation for all the iotz commands is available under [README](../../README.md)