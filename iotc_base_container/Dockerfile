#-------------------------------------------------------------------------------
# Copyright (C) Microsoft. All rights reserved.
# Licensed under the MIT license.
#-------------------------------------------------------------------------------

FROM ubuntu:xenial
LABEL AUTHOR="Oguz Bastemur <oguz.bastemur@microsoft.com>"
ARG ARG_VERSION
LABEL version="$ARG_VERSION"

RUN    apt update \
    && apt install -y python build-essential openssl make git python-dev ssh \
    && apt install -y gcc-arm-none-eabi software-properties-common cmake \
    && apt install -y build-essential python-pip mercurial python-setuptools \
    && apt install -y gcc-avr avr-libc avrdude curl unzip \
    && apt-get clean \
    && pip install mbed-cli

WORKDIR /tools
COPY arduino15.base arduino.tar.xz boot_patch.py /tools/

RUN    mv arduino15.base arduino15.tar.gz \
    && tar xf arduino.tar.xz && tar xfz arduino15.tar.gz \
    && rm arduino.tar.xz && rm arduino15.tar.gz \
    && ln -s /tools/arduino-1.8.5/arduino-builder /usr/local/bin/arduino-builder \
    && ln -s /tools/arduino-1.8.5/arduino /usr/local/bin/arduino \
    && mv .arduino15 ~/

WORKDIR /src