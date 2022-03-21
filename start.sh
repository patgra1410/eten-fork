#!/bin/bash

tsc
if [ ! $? -eq 0 ] 
then
	echo "Typesript didn't compile :("
	exit
fi

node dist
touch data/crashed
curl -X POST `cat webhook-link` -H "Content-Type: application/json" --data-binary @- <<DATA
{
  "content": "@everyone\n\nETEN HAS WORKED\n`cat ./data/uptime`\nDAYS WITHOUT AN ACCIDENT"
}
DATA
