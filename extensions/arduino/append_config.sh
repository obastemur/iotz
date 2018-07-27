contents=`cat $1`
echo -e "IOTZ_BOARD_FILE_PATH=$1\n$contents\n" >> boards.config