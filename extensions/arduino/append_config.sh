#!/bin/bash
#-------------------------------------------------------------------------------
# Copyright (C) Microsoft. All rights reserved.
# Licensed under the MIT license.
#-------------------------------------------------------------------------------

contents=`cat $1`
echo -e "IOTZ_BOARD_FILE_PATH=$1\n$contents\n" >> boards.config