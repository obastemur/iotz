#-------------------------------------------------------------------------------
# Copyright (C) Microsoft. All rights reserved.
# Licensed under the MIT license.
#-------------------------------------------------------------------------------

FROM  ubuntu:xenial
LABEL AUTHOR="Oguz Bastemur <oguz.bastemur@microsoft.com>"
ARG   ARG_VERSION
LABEL version="$ARG_VERSION"

RUN    apt update \
    && apt install -y software-properties-common mercurial \
    && apt install -y build-essential openssl make cmake git \
    && apt install -y python python-dev python-pip python-setuptools \
    && apt install -y wget curl unzip uisp libcurl4-openssl-dev libssl-dev uuid-dev \
    && add-apt-repository ppa:team-gcc-arm-embedded/ppa && apt update \
    && apt install -y gcc-arm-embedded \
    && apt upgrade -y \
    && apt-get clean

WORKDIR /src
