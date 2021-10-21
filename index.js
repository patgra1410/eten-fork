'use strict'

const Discord = require('discord.js')
const config = require('./config.json')
const fs = require('fs')
const cron = require('cron')
const util = require('util')
const fetch = require('node-fetch')
const { joinImages } = require('join-images')
const streamPipeline = util.promisify(require('stream').pipeline)
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] })
client.commands = new Discord.Collection()
client.textTriggers = new Discord.Collection()

let librusCurrentBearer
let dzwonekChannel
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

let coChannel=undefined
let coUsers

// TODO: Regex triggers for free text? ("/ROZPIERDOL.+KOTA/gi")
// Won't this overload the bot if there are too many?
// TODO: Handling for editReply in interactions? and stuff

// Daily Inspiration cron
const dailyJob = new cron.CronJob(
  '0 0 6 * * *',
  async function () {
    // Get inspirational image and send. Or at least, try to.
    try {
      const res = await fetch('https://inspirobot.me/api?generate=true')
      if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`)
      const response = await fetch(await res.text())
      if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`)
      await streamPipeline(response.body, fs.createWriteStream('./data/placeholder.jpg'))
      const attachment = new Discord.MessageAttachment('./data/placeholder.jpg')
      const inspireChannel = client.channels.cache.get('719825061552455760')
      inspireChannel.send({ content: '**Inspiracja na dziś:', files: [attachment] })
    } catch (error) {
      console.error(`Daily inspire failed... ${error}`)
      dzwonekChannel.send({ content: 'Dzienna inspiracja się wyjebała <@567054306688106496> :(' })
    }
    // Get weather report image and send. Or at least, try to.
    try {
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
      dzwonekChannel.send({ files: [weatherAttachment] })
    } catch (error) {
      console.error(`Daily weather failed... ${error}`)
      dzwonekChannel.send({ content: 'Dzienna pogoda się wyjebała <@567054306688106496> :(' })
    }
  },
  null,
  true,
  'Europe/Warsaw'
)
dailyJob.start()

function deleteMessage(message)
{
  console.log(message.content)
  message.delete()
}

async function coCountdown()
{
  try {
    if(coUsers.count==0)
      clearInterval(coUsers.interval)

    if(coUsers.count>=0)
    {
      client.channels.cache.get(coChannel).send(String(coUsers.count)).then(message => {
        setTimeout(deleteMessage.bind(null, message), 10000+parseInt(message.content)*1000)
      })

      coUsers.count--
      if(coUsers.count>=0)
      return
    }
    var msg='<@'+coUsers.jajco+'> skisłeś'

    var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
    if(ranking['jajco'][coUsers.jajco]===undefined)
      ranking['jajco'][coUsers.jajco]=0
    ranking['jajco'][coUsers.jajco]++

    fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

    client.channels.cache.get(coChannel).send(msg)
    coChannel=undefined
    coUsers=undefined
  } catch(error) {
    console.log(error)
  }
}

async function updateBearer () {
  let setCookies = []
  let cookies = []
  let sendableCookies = []
  let csrfToken = ''
  const csrfRegex = /<meta name="csrf-token" content="(.*)">/g
  // dzwonekChannel.send('lol')
  // const someFuckingClientIdConstant = 'AyNzeNoSup7IkySMhBdUhSH4ucqc97Jn6DzVcqd5'
  console.log('\x1b[45mGET https://portal.librus.pl/\x1b[0m')
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
  console.log('\x1b[45mPOST https://portal.librus.pl/rodzina/login/action\x1b[0m')
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

  console.log('\x1b[45mGET https://portal.librus.pl/api/v3/SynergiaAccounts\x1b[0m')
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
  return finalJson.accounts[0].accessToken
}

async function getSchoolNoticesJson () {
  try {
    // Get the initial JSON of announcements
    console.log('Checking for new announcements via api.librus.pl (GET /PushChanges)')
    const changesResult = await fetch(
      `https://api.librus.pl/2.0/PushChanges?pushDevice=${config.pushDevice}`,
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
    // Vars used later
    let librusQueryErrorFlag = false
    let changesJson
    // If can't parse, raise error flag (probably malformed/shitty result).
    try {
      changesJson = JSON.parse(await changesResult.text())
    } catch (error) {
      librusQueryErrorFlag = true
    }
    // If: Result is not code 200
    // OR
    // the JSON is not the expected one (incorrect)
    // OR
    // JSON parse in general failed,
    // log error, get a new bearer, retry.
    //
    // If any of this massively fails for some reason (like updating bearer),
    // it will just retry getSchoolNoticesJson in 2 mins
    // (see the catch block at the end)
    if (!changesResult.ok || !('Changes' in changesJson) || librusQueryErrorFlag) {
      // Log what's up.
      console.log(`Request error code: ${changesResult.statusText}`)
      console.log('GET Request with Token failed. Bearer token probably expired.')
      if (!librusQueryErrorFlag) {
        console.log('Additionally, here\'s the parsed JSON of the result.')
        console.log(changesJson)
        if (changesJson.Status === 'Maintenance') {
          console.log('Seems like Librus is undergoing maintenance. Throwing error for function.')
          throw new Error('Librus is under maintenance.')
        }
      }
      console.log('Trying to update token.')
      // Try to get a new bearer, retry getSchoolNoticesJson on success.
      try {
        librusCurrentBearer = await updateBearer()
      } catch (error) {
        throw new Error(`updateBearer() failed! ${error}`)
      }
      console.log('(Bearer updated, retrying)')
      getSchoolNoticesJson()
      return
    }
    // Iterate over changes since last time we checked
    // Also get the channel to potentially send messages later
    for (const update of changesJson.Changes) {
      // Get the notice if the element is of type 'SchoolNotices'
      if (update.Resource.Type === 'SchoolNotices') {
        console.log(`\x1b[36mGET ${update.Resource.Url}\x1b[0m`)
        const noticeResult = await fetch(update.Resource.Url, {
          headers: {
            Host: 'api.librus.pl',
            Connection: 'keep-alive',
            Authorization: 'Bearer ' + librusCurrentBearer,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36'
          }
        })
        const noticeJson = JSON.parse(await noticeResult.text())
        if (noticeJson.Code === 'NoticeNotFound') {
          console.log(`\x1b[31mNoticeNotFound for ${update.Resource.Id}\x1b[0m`)
        } else {
          // Base string
          let text = (
            `**__:loudspeaker: Nowe Ogłoszenie w Librusie__**
            **__${noticeJson.SchoolNotice.Subject}__**
            ${noticeJson.SchoolNotice.Content}`.replace(/  +/g, '')
          )
          // Put all relevant classes in Bold
          text = text.replace(/3[a-iA-i ]*[AC]|3[A-Ia-i ]*[AaCc][A-Ia-i ]*3/g, '**$&**')
          // 3A(3)
          text = text.replace(/^.*(3[a-iA-i ]*[A]|3[A-Ia-i ]*[Aa][A-Ia-i ]*3).*$/gm, '<@&885211379408207962> $&')
          // 3C(3)
          text = text.replace(/^.*(3[a-iA-i ]*[C]|3[A-Ia-i ]*[Cc][A-Ia-i ]*3).*$/gm, '<@&885211432025731092> $&')
          // Truncate if over discord's message limit after previous operations
          if (text.length > 2000) {
            console.log('string too long')
            text = text.slice(0, 1996)
            text += '...'
          }
          // Finally, send.
          await dzwonekChannel.send(text)
          console.log(`\x1b[1m${noticeJson.SchoolNotice.Id}  --- Sent!\x1b[0m`)
        }
      } else {
        console.log(`\x1b[2m${update.Resource.Url} --- Not SchoolNotices. Ignored.\x1b[0m`)
      }
      // DELETE once handled
      console.log(`\x1b[33mDELETE https://api.librus.pl/2.0/PushChanges/${update.Id}?pushDevice=${config.pushDevice}\x1b[0m`)
      const deleteRequest = await fetch(`https://api.librus.pl/2.0/PushChanges/${update.Id}?pushDevice=${config.pushDevice}`, {
        method: 'DELETE',
        headers: {
          Host: 'api.librus.pl',
          Connection: 'keep-alive',
          Authorization: 'Bearer ' + librusCurrentBearer,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36'
        }
      })
      if (!deleteRequest.ok) {
        throw new Error(`unexpected response ${deleteRequest.statusText}`)
      }
    }
  } catch (error) {
    console.log('\x1b[31mSomething in updating notices failed:\x1b[0m')
    console.error(error)
    console.log('\x1b[31mRetrying getSchoolNoticesJson() in 10 mins.\x1b[0m')
    setTimeout(getSchoolNoticesJson, (2 * 60000))
    return
  }
  console.log('\x1b[42m(Done)\x1b[0m')
  setTimeout(getSchoolNoticesJson, ((Math.round(Math.random() * (6 - 4) + 4)) * 60000))
}

async function updateSlashCommands () {
  const slashCommands = []
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`)
    client.commands.set(command.data.name, command)

    slashCommands.push(command.data.toJSON())

    for (const alias in command.aliases) {
      client.commands.set(command.aliases[alias], command)
    }
  }
  const response = await client.application?.commands.set(slashCommands)
  console.log(response)
}

client.once('ready', async () => {
  client.user.setStatus('online')
  client.user.setActivity('twoja stara')
  updateSlashCommands()
  console.log(`Ready! Logged in as ${client.user.tag}`)
  dzwonekChannel = client.channels.cache.get('884370476128944148')

  if (!fs.existsSync('./data/ranking.json'))
    fs.writeFileSync('./data/ranking.json', '{}')

  var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
  var rankingOptions=['pilkarzyki', 'kwadraty', 'teampilkarzyki', 'najdluzszyruch', 'najdluzszagrateampilkarzyki', 'najdluzszagrapilkarzyki', 'sumaruchow', 'jajco']
  for(let opt of rankingOptions)
    if(ranking[opt]===undefined)
      ranking[opt]={}
  fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))
  
  if(!fs.existsSync('./data/userSettings.json'))
    fs.writeFileSync('./data/userSettings.json', '{}')

  librusCurrentBearer = await updateBearer()
  setTimeout(getSchoolNoticesJson, 2000)
})

client.on('messageCreate', async message => {
  if (message.author.bot) return
  if (!client.application?.owner) await client.application?.fetch()

  if (message.channel.id === '813703962838564865') {
    try {
      await message.react('<:among_us:754362953104359747>')
    } catch (error) {
      console.error('Failed to react in #amogus channel')
    }
  }

  if (message.channel.id === '854294979849748510') {
    try {
      await message.react('❤')
    } catch (error) {
      console.error('Failed to react in #bardzo-wazny-kanal')
    }
  }

  // TODO: ===
  if (message.content.length == 4) {
    await client.commands.get('kwadraty').onMessage(message)
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

  let messageLower=message.content.toLowerCase()
  if((messageLower.endsWith(' co') || messageLower.endsWith(' co?') || messageLower=='co' || messageLower=='co?') && coChannel===undefined) {
    coUsers={jajco: message.author.id, daszek: [], count: 10, interval: undefined, messages: []}
    coChannel=message.channel.id

    coUsers.interval=setInterval(coCountdown, 1000)

    message.channel.send('https://cdn.discordapp.com/attachments/455236204477022208/899223760488497242/109.173.177.194-2021.10.05.16.37.49.jpg')
  }
  if(message.content=='^' && coChannel!==undefined)
  {
    coUsers.daszek.push(message.author.id)
  }
  if(coChannel!==undefined && message.author.id===coUsers.jajco && message.mentions.users.size>0 && !coUsers.daszek.includes(message.mentions.users.keys().next().value))
  {
    var uid=message.mentions.users.keys().next().value
    if(uid==client.user.id)
    {
      if(Math.random()<=0.01 && !coUsers.daszek.includes('257119850026106880'))
      {
        message.channel.send('<@257119850026106880>')
        coUsers.jajco='257119850026106880'
        return
      }
      else
      {
        message.channel.send('Twoja stara')
        return
      }
    }
    coUsers.jajco=uid
  }
})

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    try {
      await client.commands.get(interaction.customId.split('#')[0]).execute(interaction)
    } catch(error) {
      console.log(error)
    }
    return
  }

  if (!interaction.isCommand()) return

  if (!client.commands.has(interaction.commandName)) return

  try {
    try {
      await client.commands.get(interaction.commandName).execute(interaction)
    } catch(error) {
      console.log(error)
    }
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
