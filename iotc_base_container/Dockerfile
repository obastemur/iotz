#-------------------------------------------------------------------------------
# Copyright (C) Microsoft. All rights reserved.
# Licensed under the MIT license.
#-------------------------------------------------------------------------------

FROM ubuntu:xenial
LABEL AUTHOR="Oguz Bastemur <oguz.bastemur@microsoft.com>"
ARG   ARG_VERSION
LABEL version="$ARG_VERSION"

RUN    apt update \
    && apt install -y python build-essential openssl make git python-dev ssh \
    && apt install -y gcc-arm-none-eabi software-properties-common cmake \
    && apt install -y build-essential python-pip mercurial python-setuptools \
    && apt install -y gcc-avr avr-libc avrdude curl unzip \
    && apt-get clean

WORKDIR /src