'use strict'

const config = require('../config.json')
const fs = require('fs')
const {  joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice')
let player = createAudioPlayer()
let client

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function randomSoundOnVoice()
{
    let channels = client.guilds.cache.get(config.guild).channels.cache.filter(c => c.type == 'GUILD_VOICE')

    let isThereAnyone = false
    for(let [id, channel] of channels) {
        if(channel.members.size==0 || Math.random()>=config.randomSoundeffectChance)
            continue
        isThereAnyone = true

        let connection=joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator
        })

        let files = fs.readdirSync('./soundeffects')
    
        let resource=createAudioResource('./soundeffects/'+files[Math.floor(Math.random() * files.length)])
        connection.subscribe(player)
        player.play(resource)
        while(player.state.status!='idle')
            await sleep(100)
        connection.disconnect()
    }

    setTimeout(randomSoundOnVoice, (isThereAnyone ? 1000 * 60 : 1000 * 60 * 15))
}

module.exports = async function(cl) {
    client = cl
    if (config.playRandomSoundeffects)
        setTimeout(randomSoundOnVoice, 1000 * 60)
}