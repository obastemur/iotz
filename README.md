### iotc - iot compiler tooling for arduino && arm mbed

#### Requirement

Install Docker for your system.

#### Install

```
npm install -g @azure-iot/iotc
```

#### Use

```
usage: iotc <path> [options]

  options:

  -h, --help                               :  display available options
  -v, --version                            :  show version
                                           :
  -c, --compile=[target platform]          :  a=arduino m=ARMmbed
      --update                             :  update base container to latest
  -t, --target=[target name]               :  ARM mbed target board name

  example: iotc . -c=m -t=DISCO_L475VG_IOT01A
           iotc ./app.ino -c=a -t=AZ3166:stm32f4:MXCHIP_AZ3166
```

#### Target Board Names

`ARM mbed` target names are available from `https://os.mbed.com/`. Simply find
your board there and on the same page you will find the `TARGET NAME` for that board.

`Arduino` target names might be a bit more tricky to find but the list below should help
for starters;

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


#### How containers are managed

`iotc` creates a sub container that is tailored for your project and depend on
`azureiot/iotc` container.

In order to benefit from docker caching, name approach below is used.

`aiot_iotc_` `target_board` `folder_ino`

i.e. `aiot_iotc_az3166_stm32f4_mxchip_az3166_7396162`

#### LICENSE

MIT