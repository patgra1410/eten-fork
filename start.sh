#!/bin/bash

rm -dr dist/
tsc
if [ ! $? -eq 0 ] 
then
	echo "Typescript didn't compile :("
	exit
fi
echo "Typescript compiled~ uwu"

while true
do
	node dist
	touch data/crashed
	curl -X POST `cat webhook-link` -H "Content-Type: application/json" --data-binary @- <<DATA
	{
	"content": "<@416162471368327178> (<@257119850026106880>) (@everyone)\n\nETEN HAS WORKED\n`cat ./data/uptime`\nDAYS WITHOUT AN ACCIDENT"
	}
DATA
done
