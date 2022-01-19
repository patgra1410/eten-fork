'use strict'

const messageReactionAdd = require('./discordEvents/reactionAdd')
const messageReactionRemove = require('./discordEvents/reactionRemove')
const interactionCreate = require('./discordEvents/interactionCreate')
const messageCreate = require('./discordEvents/messageCreate')

module.exports = {
    messageReactionAdd,
    messageReactionRemove,
    interactionCreate,
    messageCreate
}