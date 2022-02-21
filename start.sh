#!/bin/bash

node . # czy cośtam niewiem zastąp tą linijkę
touch data/crushed
curl -X POST `cat webhook-link` -H "Content-Type: application/json" --data-binary @- <<DATA
{
  "content": "@everyone\n\nETEN HAS WORKED\n`cat ./data/uptime`\nDAYS WITHOUT AN ACCIDENT"
}
DATA
