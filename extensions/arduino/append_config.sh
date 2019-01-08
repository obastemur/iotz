#!/bin/sh

contents=`cat $1`
echo "IOTZ_BOARD_FILE_PATH=$1\n" >> arduino.boards.config
lookfor="menu."
echo $contents | grep -q "$lookfor" > /dev/null || \
  echo "menu.00000000000000=00000" >> arduino.boards.config && \
  echo "" >> arduino.boards.config && \
  echo "######################################\n" >> arduino.boards.config

echo "$contents\n" >> arduino.boards.config