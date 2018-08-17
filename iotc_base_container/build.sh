#!/bin/bash
#-------------------------------------------------------------------------------
# Copyright (C) Microsoft. All rights reserved.
# Licensed under the MIT license.
#-------------------------------------------------------------------------------

VERSION="0.2.2"
CONTAINER_NAME="azureiot/iotz:${VERSION}"

echo -e "- building container. this will take a while.."

# Second call is to get imageId. Assuming nothing has changed between two
# calls, we should be able to get it instantly
IMAGE_ID=$(docker build . --quiet -t $CONTAINER_NAME --build-arg ARG_VERSION=${VERSION})
if [[ $? != 0 ]]; then echo -e $IMAGE_ID && exit; fi

$(docker image rm -f azureiot/iotz:latest)

rm -rf exported.tar && \
    docker save $IMAGE_ID -o exported.tar && \
    docker image rm $IMAGE_ID && \
    docker image prune -f && \
    docker load --input exported.tar && \
    docker tag $IMAGE_ID $CONTAINER_NAME && \
    docker tag $IMAGE_ID azureiot/iotz:latest && \
    docker push $CONTAINER_NAME && \
    docker push azureiot/iotz:latest && \
    rm -rf exported.tar && \
    echo -e "Done!"

