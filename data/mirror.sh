#!/bin/bash

# options
# 1 - mirror 1st part
# 2 - mirror 2nd part
# 3 - reverse mirror 1st part
# 4 - reverse mirror 2st part

if [ $1 -eq 1 ]
then
	sox -t mp3 -V "$2" tmp/firsthalf.mp3 trim 0 $(awk -v time=$(soxi -D "$2") 'BEGIN { print ( time / 2 ) }')
	sox -t mp3 -V "tmp/firsthalf.mp3" tmp/secondhalf.mp3 reverse
	sox tmp/firsthalf.mp3 tmp/secondhalf.mp3 tmp/out.mp3
elif [ $1 -eq 2 ]
then
	sox -t mp3 -V "$2" tmp/secondhalf.mp3 trim -$(awk -v time=$(soxi -D "$2") 'BEGIN { print ( time / 2 ) }')
	sox -t mp3 -V "tmp/secondhalf.mp3" tmp/firsthalf.mp3 reverse
	sox tmp/firsthalf.mp3 tmp/secondhalf.mp3 tmp/out.mp3
elif [ $1 -eq 3 ]
then
	sox -t mp3 -V "$2" tmp/firsthalf.mp3 trim 0 $(awk -v time=$(soxi -D "$2") 'BEGIN { print ( time / 2 ) }') reverse
	sox -t mp3 -V "tmp/firsthalf.mp3" tmp/secondhalf.mp3 reverse
	sox tmp/firsthalf.mp3 tmp/secondhalf.mp3 tmp/out.mp3
elif [ $1 -eq 4 ]
then
	sox -t mp3 -V "$2" tmp/secondhalf.mp3 trim -$(awk -v time=$(soxi -D "$2") 'BEGIN { print ( time / 2 ) }') reverse
	sox -t mp3 -V "tmp/secondhalf.mp3" tmp/firsthalf.mp3 reverse
	sox tmp/firsthalf.mp3 tmp/secondhalf.mp3 tmp/out.mp3
fi