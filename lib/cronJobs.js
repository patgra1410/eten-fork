'use strict'

const cron = require('cron')
const fetch = require('node-fetch')
const { joinImages } = require('join-images')
const util = require('util')
const fs = require('fs')
const Discord = require('discord.js')
const config = require('../config.json')

const streamPipeline = util.promisify(require('stream').pipeline)
let client

// Daily Inspiration cron
const dailyJob = new cron.CronJob(
	'0 0 6 * * *',
	async function() {
		// Get inspirational image and send. Or at least, try to.
		const settings = require('../data/settings.json')

		try {
			const res = await fetch('https://inspirobot.me/api?generate=true')
			if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`)
			const response = await fetch(await res.text())
			if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`)
			await streamPipeline(response.body, fs.createWriteStream('./data/placeholder.jpg'))
			const attachment = new Discord.MessageAttachment('./data/placeholder.jpg')

			for (const info of settings.inspiracja.where) {
				const inspireChannel = client.guilds.cache.get(info.guild).channels.cache.get(info.channel)
				await inspireChannel.send({ content: '**Inspiracja na dziś:**', files: [attachment] })
			}
		}
		catch (error) {
			console.error(`Daily inspire failed... ${error}`)
		}
		// Get weather report image and send. Or at least, try to.
		for (const city of config.cronWeather) {
			try {
				const result = await fetch(city.link)
				if (!result.ok) throw new Error(`Unexpected response ${result.statusText}`)
				const resultText = await result.text()
				// const imageRegex = /src="(https:\/\/www\.meteo\.pl\/um\/metco\/mgram_pict\.php\?ntype=0u&fdate=[0-9]+&row=406&col=250&lang=pl)"/g
				const imageRegex = /src="(https:\/\/www\.meteo\.pl\/um\/metco\/mgram_pict\.php\?ntype=0u&fdate=[0-9]+&row=[0-9]+&col=[0-9]+&lang=pl)"/g
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
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
					},
				})
				if (!imgResult.ok) throw new Error(`Unexpected response ${result.statusText}`)
				await streamPipeline(imgResult.body, fs.createWriteStream('./data/weather.png'))
				const img = await joinImages(['data/leg60.png', 'data/weather.png'], { direction: 'horizontal' })
				await img.toFile('data/weatherFinal.png')
				const weatherAttachment = new Discord.MessageAttachment('./data/weatherFinal.png')

				for (const info of settings.pogoda.where) {
					const channel = client.guilds.cache.get(info.guild).channels.cache.get(info.channel)
					if (config.cronWeather.length == 1)
						await channel.send({ files: [weatherAttachment] })
					else
						await channel.send({ content: city.title + ':', files: [weatherAttachment] })
				}
			}
			catch (error) {
				console.error(`Daily weather failed... ${error}`)
			}
		}
	},
	null,
	true,
	'Europe/Warsaw',
)

function cronImageSend() {
	if (config.cronImageSend.eneabled) {
		const imgConfig = require('../' + config.cronImageSend.images)

		for (const image of imgConfig) {
			const cronJob = new cron.CronJob(
				image.cron,
				async function() {
					for (const img of imgConfig) {
						if (img.cron == this.cronTime.source) {
							await client.guilds.cache.get(config.cronImageSend.guild).channels.cache.get(config.cronImageSend.channel).send({ files: [img.imageURL] })
							return
						}
					}
				},
				null,
				true,
				'Europe/Warsaw',
			)
			cronJob.start()
		}
	}
}

module.exports = function(cl) {
	client = cl
	dailyJob.start()
	cronImageSend()
}