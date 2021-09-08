const Discord = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders')
const config = require('./config.json')
const fs = require('fs')
const cron = require('cron')
const util = require('util')
const fetch = require('node-fetch')
const NodeCache = require('node-cache')
const streamPipeline = util.promisify(require('stream').pipeline)
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] })
client.commands = new Discord.Collection()
client.textTriggers = new Discord.Collection()
const ogloszenia = new NodeCache()

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
//const planFiles = fs.readdirSync('./plany_lekcji').filter(file => file.endsWith('.json'))
//const planJobs = []

// TODO: Regex triggers for free text (steam:// links, "/ROZPIERDOL.+KOTA/gi")
// TODO: Handling for editReply and stuff

const inspireJob = new cron.CronJob(
  '0 30 7 * * *',
  async function () {
    const res = await fetch('https://inspirobot.me/api?generate=true')
    if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`)
    const response = await fetch(await res.text())
    if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`)
    await streamPipeline(response.body, fs.createWriteStream('./placeholder.jpg'))
    const attachment = new Discord.MessageAttachment('./placeholder.jpg')
    const inspireChannel = client.channels.cache.get('719825061552455760')
    inspireChannel.send({ content: '**Inspiracja na dziś:', files: [attachment] })
  },
  null,
  true,
  'Europe/Warsaw'
)
inspireJob.start()

/*
for (const file of planFiles) {
  const classPlan = require(`./plany_lekcji/${file}`)
  for (const time in classPlan.periods) {
    // console.log(classPlan.periods[time])
    const hours = classPlan.periods[time].split(' ')
    hours.splice(1, 1)
    // console.log(hours)
    const timeStart = hours[0].split(':')
    const timeEnd = hours[1].split(':')
    // console.log(timeStart)
    // console.log(timeEnd)
    // console.log('\n')
    planJobs.push(new cron.CronJob(
      `0 ${timeStart[1]} ${timeStart[0]} * * *`,
      async function () {
        const res = await fetch('https://inspirobot.me/api?generate=true')
        if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`)
        const response = await fetch(await res.text())
        if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`)
        await streamPipeline(response.body, fs.createWriteStream('./placeholder.jpg'))
        const attachment = new Discord.MessageAttachment('./placeholder.jpg')
        const planChannel = client.channels.cache.get('884370476128944148')
        planChannel.send({ content: '**Zaczyna się lekcja:', files: [attachment] })
        }
      },
      null,
      true,
      'Europe/Warsaw'
    ))
  }
}
*/

async function refreshSchoolNoticeCache () {
  fs.readFile('oglo.json', function (err, data) {
    if (err) {
      throw err
    }
    const noticeJson = JSON.parse(data)
    for (const notice of noticeJson) {
      console.log(notice)
      if (!ogloszenia.has(notice)) {
        console.log(`${notice}  --- Unknown ID, adding to cache.`)
        ogloszenia.set(notice, 'true')
      }
    }
  })
}

async function updateSchoolNoticeJson () {
  fs.writeFile('oglo.json', JSON.stringify(ogloszenia.keys()), 'utf-8', function (err) {
    if (err) {
      throw err
    }
  })
}

async function getSchoolNoticesJson () {
  console.log('Checking for new announcements via api.librus.pl')
  const res = await fetch(
    'https://api.librus.pl/2.0/SchoolNotices',
    {
      headers: {
        Host: 'api.librus.pl',
        Connection: 'keep-alive',
        Accept: 'application/json',
        DNT: '1',
        Authorization: config.librusAuthorization,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
        Origin: 'https://portal.librus.pl',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        Referer: 'https://portal.librus.pl/',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-GB,en;q=0.9'
      }
    }
  )
  const resText = await res.text()
  const noticeJson = JSON.parse(resText)
  // console.log(noticeJson)
  const dzwonekChannel = client.channels.cache.get('780946974274093076')
  for (const notice in noticeJson.SchoolNotices) {
    // console.log(noticeJson.SchoolNotices[notice].Id)
    if (!ogloszenia.has(noticeJson.SchoolNotices[notice].Id)) {
      console.log(`${noticeJson.SchoolNotices[notice].Id}  --- New ID, adding!`)
      ogloszenia.set(noticeJson.SchoolNotices[notice].Id, 'true')
      let text = (
        `**:loudspeaker: Nowe Ogłoszenie w Librusie**
        **${noticeJson.SchoolNotices[notice].Subject}**
        ${noticeJson.SchoolNotices[notice].Content}`.replace(/  +/g, '')
      )
      console.log(text.length)
      if (text.length > 2000) {
        console.log('string too long')
        text = text.slice(0, 1996)
        text += '...'
      }
      dzwonekChannel.send(text)
    }
  }
  updateSchoolNoticeJson()
  setTimeout(getSchoolNoticesJson, ((Math.round(Math.random() * (12 - 4) + 4)) * 60000))
}

async function updateSlashCommands () {
  const coms = []
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`)
    client.commands.set(command.name, command)

    const data = new SlashCommandBuilder()
      .setName(command.name)
      .setDescription(command.description)
      .toJSON()
    coms.push(data)

    for (const alias in command.aliases) {
      client.commands.set(command.aliases[alias], command)
    }
  }
  const response = await client.application?.commands.set(coms)
  console.log(response)
}

client.once('ready', () => {
  client.user.setStatus('online')
  client.user.setActivity('twoja stara')

  updateSlashCommands()
  console.log(`Ready! Logged in as ${client.user.tag}`)
  refreshSchoolNoticeCache()
  setTimeout(getSchoolNoticesJson, 3000)
})

client.on('messageCreate', async message => {
  if (message.author.bot) return
  if (!client.application?.owner) await client.application?.fetch()

  if (message.content.startsWith(config.prefix)) {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/)
    const command = args.shift().toLowerCase()
    if (!client.commands.has(command)) return
    try {
      await client.commands.get(command).execute(message, args)
    } catch (error) {
      console.error(error)
      message.channel.send('There was an error trying to execute that command!')
    }
  }
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return

  if (!client.commands.has(interaction.commandName)) return

  try {
    await client.commands.get(interaction.commandName).execute(interaction)
  } catch (error) {
    console.error(error)
    try {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
    } catch (error) {
      console.log('Error: Couldn\'t reply, probably already replied, trying to edit')
      console.log(error)
      await interaction.editReply({ content: 'There was an error while executing this command!', ephemeral: true })
    }
  }
})

client.login(config.token)
