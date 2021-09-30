const fetch = require('node-fetch')
const { joinImages } = require('join-images')
// const mergeImages = require('merge-images')
const fs = require('fs')
const util = require('util')
const streamPipeline = util.promisify(require('stream').pipeline)
const Discord = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pogoda')
    .setDescription('Pogoda z meteo.pl'),
  async execute (interaction) {
    const result = await fetch('https://m.meteo.pl/warszawa/60')
    if (!result.ok) throw new Error(`Unexpected response ${result.statusText}`)
    const resultText = await result.text()
    const imageRegex = /src="(https:\/\/www\.meteo\.pl\/um\/metco\/mgram_pict\.php\?ntype=0u&fdate=[0-9]+&row=406&col=250&lang=pl)"/g
    const link = imageRegex.exec(resultText)[1]
    const imgResult = await fetch(link, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en;q=0.9',
        Host: 'www.meteo.pl',
        Referer: 'https://m.meteo.pl/',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36'
      }
    })
    if (!imgResult.ok) throw new Error(`Unexpected response ${result.statusText}`)
    await streamPipeline(imgResult.body, fs.createWriteStream('./data/weather.png'))
    const img = await joinImages(['data/leg60.png', 'data/weather.png'], { direction: 'horizontal' })
    await img.toFile('data/weatherFinal.png')
    const weatherAttachment = new Discord.MessageAttachment('./data/weatherFinal.png')
    interaction.reply({ files: [weatherAttachment] })
  }
}
