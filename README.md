# Eten

### Notification on channel when bot fails
to setup add your webhook link to file `webhook-link` and run bot with `./start.sh`

### Config file
| Config | Description |
|:------:| :--------- |
| prefix | prefix of the bot |
| token | token of the bot |
| librus | whether to check liburs |
| librusLogin | email to login to librus |
| librusPass | password for librus |
| pushDevice | librus-provided pushDevice acquired manually from new app login |
| adminID | IDs of users that will be admins of this bot (they will be able to use /manage) |
| guild | id of the guild |
| playRandomSoundeffects | whether Eten should join voice channels and play sound effects |
| randomSoundeffectChance | chance of Eten to join a voice channel every minute (doesn't matter if `playRandomSoundeffects = false`) |
| bets | settings releted to bets |
| bets.eneabled | whether bets are eneabled |
| bets.guild | guild ID on which bets will work |
| bets.channel | channel ID on which bets should be sent and on which ranking will be sent |
| allowedBoardsForTracking | boards allowed for tracking - see format in config_EXAMPLE.json |
| cronWeather | array of cities which weather will be send every morning |
| cronImageSend | config for sending images at given times |
| pilkarzykiBot | configuration for bot for pilkarzyki (explained below) |

### pilkarzykiBot config
| Config | Description |
|:------:| :---------- |
| maxDepth | maximal depth that users can specify |
| evaluationFunctionConfig | Specifies which evaluation function should be used for given condition. This should be an array of dictionaries. In each dictionary you should specify `condition` (for example ``depth<=3``) and `path` which should be array of strings that will be the path to evaluation functions which should be used for a given condition. One function will be randomly selected from `path` array. |

### cronImageSend config
Array of dictionaries:
| Config of dict | Description |
| :------------: | :--------- |
| cron | cron time ([cron time format](https://support.acquia.com/hc/en-us/articles/360004224494-Cron-time-string-format)) |
| imageUrl | image url that will be sent |


### sound effects
put your sound effects in soundeffects/