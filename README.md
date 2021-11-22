# Eten

### Config file
| Config | Description |
|:------:| ----------- |
| prefix | prefix of the bot |
| token | token of the bot |
| librusLogin | email to login to librus |
| librusPass | password for librus |
| pushDevice | librus-provided pushDevice acquired manually from new app login |
| guild | id of the guild |
| playRandomSoundeffects | whether Eten should join voice channels and play sound effects |
| randomSoundeffectChance | chance of Eten to join a voice channel every minute (doesn't matter if `playRandomSoundeffects = false`) |
| cronWeather | array of cities which weather will be send every morning |
| pilkarzykiBot | configuration for bot for pilkarzyki (explained below) |
| allowedBoardsForTracking | | boards allowed for tracking - see format in config_EXAMPLE.json |

### pilkarzykiBot config
| Config | Description |
|:------:| ----------- |
| maxDepth | maximal depth that users can specify |
| evaluationFunctionConfig | Specifies which evaluation function should be used for given condition. This should be an array of dictionaries. In each dictionary you should specify `condition` (for example ``depth<=3``) and `path` which should be array of strings that will be the path to evaluation functions which should be used for a given condition. One function will be randomly selected from `path` array. |

### sound effects
put your sound effects in soundeffects/