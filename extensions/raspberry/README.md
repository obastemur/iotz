### iotz - raspberry

Try now! (lets create a raspberry pi `hello-world` project)

```
iotz create raspberry hello
cd hello
iotz init
```

Plese check the `hello` folder.
You should already have a `Makefile` similar to one below;
```
# iotz - hello makefile

CC_COMPILER  = /tools/rpitools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-gcc
CXX_COMPILER = /tools/rpitools/arm-bcm2708/arm-rpi-4.9.3-linux-gnueabihf/bin/arm-linux-gnueabihf-g++

C_FLAGS = -Os -fPIC

hello.o: hello.cpp
	$(CXX_COMPILER) $(CFLAGS) hello.cpp -o hello.o && echo 'hello.o is ready'
clean:
	rm hello.o
```

Everything is set! Go and edit `hello.cpp` now.
Once you are finished;

```
iotz make
```

That's it!

Documentation for all the iotz commands is available under [README](../../README.md)