### iotz - arduino

Try now! (lets create an arduino `hello-world` project)

```
iotz create arduino uno hello
cd hello
iotz init
```

Everything is set! Go and edit `hello.cpp` now.
Once you are finished;

```
iotz compile
```

That's it! The binary you need is under `BUILD/` folder.
Flash that binary into your board and you are all set.

#### Setting up PRE && POST build steps.

Try `iotz export`

iotz will create you a `Makefile` that you may set pre/post build steps.

i.e. (for the sample above) see the the `Makefile` below;
```
all:
	arduino --board 'AZ3166:stm32f4:MXCHIP_AZ3166' --verify 'sampleApplication.ino' --pref build.path=/src/arduino_create/BUILD
clean :
	iotz run mr -rf BUILD/
```

`p.s. please keep the tab character as is (that is required by Make)`
So.. if we want to echo `hello` pre compile step; our `Makefile` would be;

```
all:
	echo 'hello'
	arduino --board 'AZ3166:stm32f4:MXCHIP_AZ3166' --verify 'sampleApplication.ino' --pref build.path=/src/arduino_create/BUILD
clean :
	iotz run mr -rf BUILD/
```

In order to use the `Makefile` above, you may either use `run` or `make` commands.

try `iotz make` or `iotz run make`

Documentation for all the iotz commands is available under [README](../../README.md)