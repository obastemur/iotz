### Azure IOT - ARM mbed and Arduino builds are easy

#### Requirement

Install Docker for your system.

#### How To

##### Install

```
npm install -g @azure-iot/iotc
```

##### Use

```
iotc --help
```

##### How containers are managed

`iotc` creates a sub container that is tailored for your project and depend on
either `azureiot/iotc_arduino` or `azureiot/iotc_mbed` containers.

In order to benefit from docker caching, name approach below is used.

`aiot_iotc_` `target_board` `folder_ino`

i.e. `aiot_iotc_az3166_stm32f4_mxchip_az3166_7396162`

##### LICENSE

MIT