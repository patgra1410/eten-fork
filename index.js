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

let librusCurrentBearer = fs.readFileSync('data/librusBearer.txt', 'utf-8')
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

// TODO: Regex triggers for free text? ("/ROZPIERDOL.+KOTA/gi")
// Won't this overload the bot if there are too many?

// TODO: Handling for editReply and stuff

// Daily Inspiration cron
const dailyJob = new cron.CronJob(
  '0 0 6 * * *',
  async function () {
    const res = await fetch('https://inspirobot.me/api?generate=true')
    if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`)
    const response = await fetch(await res.text())
    if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`)
    await streamPipeline(response.body, fs.createWriteStream('./data/placeholder.jpg'))
    const attachment = new Discord.MessageAttachment('./data/placeholder.jpg')
    const inspireChannel = client.channels.cache.get('719825061552455760')
    inspireChannel.send({ content: '**Inspiracja na dziś:', files: [attachment] })

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
    const weatherAttachment = new Discord.MessageAttachment('./data/weather.png')
    const dzwonekChannel = client.channels.cache.get('884370476128944148')
    dzwonekChannel.send({ files: [weatherAttachment] })
  },
  null,
  true,
  'Europe/Warsaw'
)
dailyJob.start()

async function refreshSchoolNoticeCache () {
  // Read known School Notices from data/knownOglo.json - should be called only once on start,
  // the info should really be pulled from the live cache
  fs.readFile('data/knownOglo.json', function (err, data) {
    if (err) {
      throw err
    }
    const noticeJson = JSON.parse(data)
    for (const notice of noticeJson) {
      // console.log(notice)
      if (!ogloszenia.has(notice)) {
        console.log(`${notice}  --- Adding ID to cache`)
        ogloszenia.set(notice, 'true')
      }
    }
  })
}

async function updateSchoolNoticeCacheJson () {
  // Save known (sent) School Notices to data/knownOglo.json for future re-caching
  fs.writeFile('data/knownOglo.json', JSON.stringify(ogloszenia.keys()), 'utf-8', function (err) {
    if (err) {
      throw err
    }
  })
}

async function updateBearer () {
  // Update bearer token and save to data/librusBearer.txt
  let setCookies = []
  let cookies = []
  let sendableCookies = []
  let csrfToken = ''
  const csrfRegex = /<meta name="csrf-token" content="(.*)">/g
  // dzwonekChannel.send('lol')
  // const someFuckingClientIdConstant = 'AyNzeNoSup7IkySMhBdUhSH4ucqc97Jn6DzVcqd5'
  console.log('GET https://portal.librus.pl/')
  const portalResult = await fetch('https://portal.librus.pl/')
  if (!portalResult.ok) {
    throw new Error(`unexpected response ${portalResult.statusText}`)
  }
  const portalResultText = await portalResult.text()
  csrfToken = csrfRegex.exec(portalResultText)[1]
  // console.log(csrfToken)
  setCookies = portalResult.headers.raw()['set-cookie']
  for (const cookie of setCookies) {
    cookies.push(cookie.split(';')[0])
  }
  // console.log(cookies)
  sendableCookies = cookies.join('; ')

  const body = { email: config.librusLogin, password: config.librusPass }
  console.log('POST https://portal.librus.pl/rodzina/login/action')
  const actionResult = await fetch('https://portal.librus.pl/rodzina/login/action', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      Host: 'portal.librus.pl',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
      Connection: 'keep-alive',
      'X-CSRF-TOKEN': csrfToken,
      Cookie: sendableCookies
    }
  })
  if (!actionResult.ok) {
    throw new Error(`unexpected response ${actionResult.statusText} ${actionResult.status}`)
  }
  setCookies = actionResult.headers.raw()['set-cookie']
  cookies = []
  for (const cookie of setCookies) {
    cookies.push(cookie.split(';')[0])
  }
  // console.log(cookies)
  sendableCookies = cookies.join('; ')

  console.log('GET https://portal.librus.pl/api/v3/SynergiaAccounts')
  const accountsResult = await fetch('https://portal.librus.pl/api/v3/SynergiaAccounts', {
    method: 'GET',
    headers: {
      Host: 'portal.librus.pl',
      Connection: 'keep-alive',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
      Cookie: sendableCookies
    }
  })
  const finalText = await accountsResult.text()
  const finalJson = JSON.parse(finalText)
  librusCurrentBearer = finalJson.accounts[0].accessToken
  fs.writeFile('data/librusBearer.txt', librusCurrentBearer, 'utf-8', function (err) {
    if (err) {
      throw err
    }
  })
}

async function getSchoolNoticesJson () {
  // Get School Notices, send new ones and save them to data/knownOglo.json (call updateSchoolNoticeCacheJson)
  console.log('Checking for new announcements via api.librus.pl')
  const res = await fetch(
    'https://api.librus.pl/2.0/SchoolNotices',
    {
      method: 'GET',
      headers: {
        Host: 'api.librus.pl',
        Connection: 'keep-alive',
        Authorization: 'Bearer ' + librusCurrentBearer,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36'
      }
    }
  )
  const resText = await res.text()
  const noticeJson = JSON.parse(resText)
  if (!('SchoolNotices' in noticeJson)) {
    console.log(noticeJson)
    console.log('Token probably expired, getting a new one.')
    await updateBearer()
    console.log('(Bearer updated, skipping rest of func and calling again)')
    getSchoolNoticesJson()
    return
  }
  setTimeout(getSchoolNoticesJson, ((Math.round(Math.random() * (6 - 4) + 4)) * 60000))
  const dzwonekChannel = client.channels.cache.get('884370476128944148')
  let update = false
  for (const notice in noticeJson.SchoolNotices) {
    // console.log(noticeJson.SchoolNotices[notice].Id)
    if (!ogloszenia.has(noticeJson.SchoolNotices[notice].Id)) {
      let text = (
        `**__:loudspeaker: Nowe Ogłoszenie w Librusie__**
        **__${noticeJson.SchoolNotices[notice].Subject}__**
        ${noticeJson.SchoolNotices[notice].Content}`.replace(/  +/g, '')
      )
      // Put all relevant classes in Bold
      text = text.replace(/3[a-iA-i ]*[AC]|3[A-Ia-i ]*[AaCc][A-Ia-i ]*3/g, '**$&**')
      // 3A(3)
      text = text.replace(/^.*(3[a-iA-i ]*[A]|3[A-Ia-i ]*[Aa][A-Ia-i ]*3).*$/gm, '<@&885211379408207962> $&')
      // 3C(3)
      text = text.replace(/^.*(3[a-iA-i ]*[C]|3[A-Ia-i ]*[Cc][A-Ia-i ]*3).*$/gm, '<@&885211432025731092> $&')
      if (text.length > 2000) {
        console.log('string too long')
        text = text.slice(0, 1996)
        text += '...'
      }
      dzwonekChannel.send(text)
      console.log(`${noticeJson.SchoolNotices[notice].Id}  --- Sent, adding the new ID!`)
      ogloszenia.set(noticeJson.SchoolNotices[notice].Id, 'true')
      update = true
    }
  }
  if (update) {
    updateSchoolNoticeCacheJson()
  }
  console.log('(Done)')
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
  setTimeout(getSchoolNoticesJson, 2000)
})

client.on('messageCreate', async message => {
  if (message.author.bot) return
  if (!client.application?.owner) await client.application?.fetch()

  if (message.channel.id === '813703962838564865') {
    message.react('<:among_us:754362953104359747>')
  }

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
