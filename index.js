const Discord = require('discord.js');
const fetch = require('node-fetch');
var CronJob = require('cron').CronJob;
const util = require('util')
const fs = require('fs')
const streamPipeline = util.promisify(require('stream').pipeline)
const client = new Discord.Client();
const CONFIG = require('./config.json');
const prefix = CONFIG.prefix;
const cronInspireChannel = CONFIG.cronInspireChannel;

var results

var job = new CronJob(
	'0 0 8 * * *',
	function() {
		cronInspire()
	},
	null,
	true,
	'Poland'
);
job.start();

client.on('message', message => {
    let msg = message.content.toUpperCase();

    if (msg === prefix + 'PING') {
        message.channel.send(`Pong!\n\`MSG: ${Date.now() - message.createdTimestamp}ms\`\n\`API: ${Math.round(client.ws.ping)}ms\``);
    };

    if (msg === prefix + 'FORCECRONINSPIRE' && message.author.id === '567054306688106496') {
        console.log(`User ${message.author.username}#${message.author.discriminator} requested cronInspire()`);
        cronInspire();
    }

    if (msg === prefix + `INSPIRUJ` || msg === prefix + `INSPIRACJA`) {
        (async () => {
            const response = await fetch('https://inspirobot.me/api?generate=true')
            .then(res => res.text())
            .then(text => message.channel.send(text));
            
        })();
    };

    if (msg === prefix + `KOTEŁ`) {
        (async () => {
            const response = await fetch('https://thiscatdoesnotexist.com/')
            if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
            //console.log(response.body);
            await streamPipeline(response.body, fs.createWriteStream('./placeholder.jpg'));
            const attachment = new Discord.MessageAttachment('./placeholder.jpg');
            message.channel.send(attachment);
            
        })();
    };

    if (msg === prefix + `INICJUJ` || msg === prefix + `INICJACJA`) {
        (async () => {
            id = Math.floor(Math.random() * 100000);
            const response = await fetch('http://www.thiswaifudoesnotexist.net/example-' + id + '.jpg')
            if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
            await streamPipeline(response.body, fs.createWriteStream('./placeholder.jpg'));
            const attachment = new Discord.MessageAttachment('./placeholder.jpg');
            message.channel.send(attachment);
        })();
    };
    /*
    if (msg.startsWith(`SPIERDALAJ`) && message.member.roles.find(r => rname === "Natchuz")) {
        console.log("INITIALIZING BTFO");
        message.channel.messages.fetch({ limit: 2 }).then(messages => {
            let lastMessage = messages.array()[1];
            let lastMessageMember = lastMessage.guild.members.fetch(lastMessage.author.id).then(idiot => {
                console.log(`BTFOing ${lastMessage.author.username}#${lastMessage.author.discriminator} for \"${lastMessage.content}\"`);
                lastMessage.author.send(`**${message.author.username}:** ${message.content}`)
                idiot.kick('spadaj');
            })
        });
    }
    */
});

async function cronInspire() {
    const res = await fetch('https://inspirobot.me/api?generate=true')
    if (!res.ok) throw new Error(`unexpected response ${res.statusText}`);
    const response = await fetch(await res.text())
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
    await streamPipeline(response.body, fs.createWriteStream('./placeholder.jpg'));
    const attachment = new Discord.MessageAttachment('./placeholder.jpg');
    client.channels.cache.get(cronInspireChannel).send("**Inspiracja na dziś:**", {files: [attachment]})
    console.log("Croninspire Sent!")
}

client.on('ready', () => {
    client.user.setStatus('online');
    client.user.setActivity("Adam hitting women", {
        type: "STREAMING",
        url: "https://www.twitch.tv/meten_"
      });
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(CONFIG.token);