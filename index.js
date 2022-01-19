'use strict'

const Discord = require('discord.js')
const {  joinVoiceChannel, createAudioPlayer, createAudioResource }=require('@discordjs/voice')
const config = require('./config.json')
const fs = require('fs')
const cron = require('cron')
const util = require('util')
const fetch = require('node-fetch')
const formData = require('form-data')
const path = require('path')
const { joinImages } = require('join-images')
const request = require('request')
const threadwatcher = require('./lib/threadwatcher')
const jajco = require('./lib/jajco')
const createRequiredFiles = require('./lib/createRequiredFiles')
const discordEvents = require('./lib/discordEvents.js')
const { exit } = require('process')
const streamPipeline = util.promisify(require('stream').pipeline)
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MEMBERS, Discord.Intents.FLAGS.GUILD_VOICE_STATES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS], partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
client.commands = new Discord.Collection()
client.textTriggers = new Discord.Collection()

let librusCurrentBearer
let dzwonekChannel
let autoMemesChannel
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))
var player=createAudioPlayer()

let coChannel=undefined
let coUsers
let imgConfig

// TODO: Regex triggers for free text? ("/ROZPIERDOL.+KOTA/gi")
// Won't this overload the bot if there are too many?
// TODO: Handling for editReply in interactions? and stuff

// Daily Inspiration cron
const dailyJob = new cron.CronJob(
  '0 0 6 * * *',
  async function () {
    // Get inspirational image and send. Or at least, try to.
    let settings = require('./data/settings.json')

    try {
      const res = await fetch('https://inspirobot.me/api?generate=true')
      if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`)
      const response = await fetch(await res.text())
      if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`)
      await streamPipeline(response.body, fs.createWriteStream('./data/placeholder.jpg'))
      const attachment = new Discord.MessageAttachment('./data/placeholder.jpg')

      for (let info of settings.inspiracja.where) {
        let inspireChannel = client.guilds.cache.get(info.guild).channels.cache.get(info.channel)
        await inspireChannel.send({ content: '**Inspiracja na dziś:**', files: [attachment] })
      }
    } catch (error) {
      console.error(`Daily inspire failed... ${error}`)
      dzwonekChannel.send({ content: 'Dzienna inspiracja się wyjebała <@567054306688106496> :(' })
    }
    // Get weather report image and send. Or at least, try to.
    for(var city of config.cronWeather)
    {
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36'
          }
        })
        if (!imgResult.ok) throw new Error(`Unexpected response ${result.statusText}`)
        await streamPipeline(imgResult.body, fs.createWriteStream('./data/weather.png'))
        const img = await joinImages(['data/leg60.png', 'data/weather.png'], { direction: 'horizontal' })
        await img.toFile('data/weatherFinal.png')
        const weatherAttachment = new Discord.MessageAttachment('./data/weatherFinal.png')
        
        for(let info of settings.pogoda.where) {
          let channel = client.guilds.cache.get(info.guild).channels.cache.get(info.channel)
          if(config.cronWeather.length==1)
            await channel.send({ files: [weatherAttachment] })
          else
            await channel.send({ content: city.title+':', files: [weatherAttachment] })
        }
      } catch (error) {
        console.error(`Daily weather failed... ${error}`)
        dzwonekChannel.send({ content: 'Dzienna pogoda się wyjebała <@567054306688106496> :(' })
      }
    }
  },
  null,
  true,
  'Europe/Warsaw'
)
dailyJob.start()

if (config.cronImageSend.eneabled)
{
  imgConfig = require('./'+config.cronImageSend.images)

  for (var image of imgConfig)
  {
    const cronJob = new cron.CronJob(
      image.cron,
      async function () {
        for (var img of imgConfig)
        {
          if (img.cron == this.cronTime.source)
          {
            await client.guilds.cache.get(config.cronImageSend.guild).channels.cache.get(config.cronImageSend.channel).send({files: [img.imageURL]})
            return
          }
        }
      },
      null,
      true,
      'Europe/Warsaw'
    )
    cronJob.start()
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function randomSoundOnVoice()
{
  var channels=client.guilds.cache.get(config.guild).channels.cache.filter(c => c.type=='GUILD_VOICE')
  
  for(var [id, channel] of channels)
  {
    if(channel.members.size==0 || Math.random()>=config.randomSoundeffectChance)
      continue

    var connection=joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator
    })

    var files = fs.readdirSync('./soundeffects')
    
    var resource=createAudioResource('./soundeffects/'+files[Math.floor(Math.random() * files.length)])
    connection.subscribe(player)
    player.play(resource)
    while(player.state.status!='idle')
      await sleep(100)
    connection.disconnect()
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

function splitMessage(message)
{
  var res=[]
  var lastEndl=-1
  var lastSplit=0
  var count=0
  var temp
  for(var i=0; i<message.length; i++)
  {
    count++
    if(message[i]=='\n')
      lastEndl=i

    if(count>=1900)
    {
      temp=""
      for(var j=lastSplit; j<=(lastEndl<lastSplit ? lastSplit+1900 : lastEndl) && j<message.length; j++)
        temp+=message[j]
      
      if(/\S/.test(temp))
        res.push(temp)
      lastSplit=(lastEndl<lastSplit ? lastSplit+1900 : lastEndl)
      i=lastSplit+1
      count=0
    }
  }

  temp=""
  for(var i=lastSplit; i<message.length; i++)
    temp+=message[i]
  if(/\S/.test(temp))
    res.push(temp)

  return res
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

          let textWithoutRoles = text
          // Put all relevant classes in Bold
          text = text.replace(/3[a-iA-i ]*[AC]|3[A-Ia-i ]*[AaCc][A-Ia-i ]*3|1[a-iA-i ]*[fF]/g, '**$&**')
          // 3A(3)
          text = text.replace(/^.*(3[a-iA-i ]*[A]|3[A-Ia-i ]*[Aa][A-Ia-i ]*3).*$/gm, '<@&885211379408207962> $&')
          // 3C(3)
          text = text.replace(/^.*(3[a-iA-i ]*[C]|3[A-Ia-i ]*[Cc][A-Ia-i ]*3).*$/gm, '<@&885211432025731092> $&')
          // 1f
          text = text.replace(/^.*(1[a-iA-i ]*[fF]).*$/gm, '<@&932523538601111584> $&')
          
          let textWithAllClasses = textWithoutRoles
          // Bold
          textWithAllClasses = textWithAllClasses.replace(/3[a-iA-i ]*[ABCDEFG]|3[A-Ia-i ]*[AaBbCcDdEeFfGg][A-Ia-i ]*3|3[a-iA-i ]*[abcdefghi]|3[A-Ia-i ]*[AaBbCcDdEeFfGgHhIi][A-Ia-i ]*4|2[a-iA-i ]*[aABbCcDdEeFfGg]|1[a-iA-i ]*[aABbCcDdEeFfGgHh]/g, '**$&**')
          // roles for 1. class
          for(let letter = 'a'.charCodeAt(); letter <= 'h'.charCodeAt(); letter++)
          {
            var roleID = '<@&' + client.guilds.cache.get('930512190220435516').roles.cache.find(role => role.name == `1${String.fromCharCode(letter)}`).id + '> $&'
            let regex = new RegExp( `^.*(1[a-iA-i ]*[${String.fromCharCode(letter)}${String.fromCharCode(letter).toUpperCase()}]).*$`, 'gm' )
            textWithAllClasses = textWithAllClasses.replace(regex, roleID)
          }
          // roles for 2. class
          for(let letter = 'a'.charCodeAt(); letter <= 'g'.charCodeAt(); letter++)
          {
            var roleID = '<@&' + client.guilds.cache.get('930512190220435516').roles.cache.find(role => role.name == `2${String.fromCharCode(letter)}`).id + '> $&'
            let regex = new RegExp( `^.*(2[a-iA-i ]*[${String.fromCharCode(letter)}${String.fromCharCode(letter).toUpperCase()}]).*$`, 'gm' )
            textWithAllClasses = textWithAllClasses.replace(regex, roleID)
          }
          // roles for 3. class gim
          for(let letter = 'a'.charCodeAt(); letter <= 'g'.charCodeAt(); letter++)
          {
            var roleID = '<@&' + client.guilds.cache.get('930512190220435516').roles.cache.find(role => role.name == `3${String.fromCharCode(letter).toUpperCase()}3`).id + '> $&'
            let regex = new RegExp( `^.*(3[a-iA-i ]*[${String.fromCharCode(letter).toUpperCase()}]|3[A-Ia-i ]*[${String.fromCharCode(letter)}${String.fromCharCode(letter).toUpperCase()}][A-Ia-i ]*3).*$`, 'gm' )
            textWithAllClasses = textWithAllClasses.replace(regex, roleID)
          }
          // roles for 3. class podst
          for(let letter = 'a'.charCodeAt(); letter <= 'i'.charCodeAt(); letter++)
          {
            var roleID = '<@&' + client.guilds.cache.get('930512190220435516').roles.cache.find(role => role.name == `3${String.fromCharCode(letter)}4`).id + '> $&'
            let regex = new RegExp( `^.*(3[a-iA-i ]*[${String.fromCharCode(letter)}]|3[A-Ia-i ]*[${String.fromCharCode(letter)}${String.fromCharCode(letter).toUpperCase()}][A-Ia-i ]*4).*$`, 'gm' )
            textWithAllClasses = textWithAllClasses.replace(regex, roleID)
          }

          // grupy
          var res=''
          for(var line of text.split('\n'))
          {
            if(!((line.search('<@&885211432025731092>')!=-1 || line.search('<@&885211379408207962>')!=-1) && line.toLowerCase().search('gr. p. ')!=-1))
            {
              res+=line+'\n'
              continue
            }

            var replaceWith=''
            for(var [id, role] of client.guilds.cache.get(config.guild).roles.cache.entries())
            {
              if(role.name.substring(0,2)=='3A' && line.search('<@&885211379408207962>')!=-1 && role.name.search('-')!=-1)
              { 
                var roleLower=role.name.toLowerCase()

                if(line.toLowerCase().search(roleLower.split('- ')[1])!=-1 || line.toLowerCase().search(roleLower.split('gr. p. ')[1])!=-1)
                {
                  if(replaceWith!='')
                    replaceWith+=' '
                  replaceWith+='<@&'+id+'>'
                }
              }
              if(role.name.substring(0,2)=='3C' && line.search('<@&885211432025731092>')!=-1 && role.name.search('-')!=-1)
              { 
                var roleLower=role.name.toLowerCase()

                if(line.toLowerCase().search(roleLower.split('- ')[1])!=-1 || line.toLowerCase().search(roleLower.split('gr. p. ')[1])!=-1)
                {
                  if(replaceWith!='')
                    replaceWith+=' '
                  replaceWith+='<@&'+id+'>'
                }
              }
            }

            if(replaceWith!='')
            {
              if(line.search('<@&885211432025731092>')!=-1)
                line=line.replace('<@&885211432025731092>', replaceWith)
              if(line.search('<@&885211379408207962>')!=-1)
                line=line.replace('<@&885211379408207962>', replaceWith)
            }
            res+=line+'\n'
          }
          text=res
          
          // Finally, send.
          let settings = require('./data/settings.json')
          for(var info of settings.notices.where)
          {
            var channel = client.guilds.cache.get(info.guild).channels.cache.get(info.channel)
            if (info.guild == '930512190220435516') {
              for (var split of splitMessage(textWithAllClasses))
                await channel.send(split)
              continue
            }   

            for (var split of splitMessage( (info.roles ? text : textWithoutRoles) ))  
              await channel.send(split)
          }
          
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
  // console.log(response)
}

threadwatcher.newReply.on('newPost', async (board, threadID, postID, text, attachmentUrl) => {
  // console.log(`${board}/${threadID}/p${postID}`)
  // console.log(text)
  // console.log(attachmentUrl)
  await autoMemesChannel.send({
    content: `<https://boards.4channel.org/${board}/thread/${threadID}#p${postID}>`,
    files: [attachmentUrl]
  })
  threadwatcher.changePostTimeoutEvent.emit('subtractTimeout')
})

client.once('ready', async () => {
  createRequiredFiles()

  client.user.setStatus('online')
  client.user.setActivity('twoja stara')
  updateSlashCommands()
  console.log(`Ready! Logged in as ${client.user.tag}`)
  dzwonekChannel = client.channels.cache.get('884370476128944148')
  // TODO: Make it a part of config.json? Or post where the thread was watched?
  autoMemesChannel = await client.channels.fetch('912265771613290547')

  librusCurrentBearer = await updateBearer()
  setTimeout(getSchoolNoticesJson, 2000)

  if(config.playRandomSoundeffects)
    setInterval(randomSoundOnVoice, 1000*60)
})

client.on('messageReactionAdd', discordEvents.messageReactionAdd)

client.on('messageReactionRemove', discordEvents.messageReactionRemove)

client.on('messageCreate',discordEvents.messageCreate)

client.on('interactionCreate', discordEvents.interactionCreate)

client.login(config.token)
