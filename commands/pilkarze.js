const Board=require('../renderer.js')
const Discord = require('discord.js')

var uids={}
var boards=[]

module.exports = {
    name: 'pilkarzyki',
    description: 'Pilkarzyki',
    // options: [{
    //     name: "gracz",
    //     description: "Drugi gracz",
    //     type: 5,
    //     required: true
    // }],
    async execute (interaction, args) {
        try {
            if(interaction.isButton())
            {
                console.log(interaction.customId)
                return
            }
        } catch {}

        if(args.length<1 || interaction.mentions.users.length==0)
        {
            interaction.reply('nie')
            return
        }
        
        var uid1=interaction.author.id
        var uid2=interaction.mentions.users.keys().next().value
        console.log(uid1, uid2)

        uids[uid1]=boards.length+1
        uids[uid2]=boards.length+1
        boards.push(new Board(50, 50, 50))
        var id=boards.length-1
        
        boards[id].draw()
        const attachment = new Discord.MessageAttachment('./data/board.png')

        var row1=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('leftup')
                    .setLabel('Lewo góra')
                    .setStyle('PRIMARY'),
                new Discord.MessageButton()
                    .setCustomId('up')
                    .setLabel('Góra')
                    .setStyle('PRIMARY'),
                new Discord.MessageButton()
                    .setCustomId('rightup')
                    .setLabel('Prawo góra')
                    .setStyle('PRIMARY')
            )
        var row2=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('left')
                    .setLabel('Lewo     ')
                    .setStyle('PRIMARY'),
                new Discord.MessageButton()
                    .setCustomId('disabled')
                    .setLabel(' ')
                    .setStyle('PRIMARY')
                    .setDisabled(true),
                new Discord.MessageButton()
                    .setCustomId('right')
                    .setLabel('Prawo     ')
                    .setStyle('PRIMARY')
            )
        var row3=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('leftdown')
                    .setLabel('Lewo dół')
                    .setStyle('PRIMARY'),
                new Discord.MessageButton()
                    .setCustomId('down')
                    .setLabel('Dół')
                    .setStyle('PRIMARY'),
                new Discord.MessageButton()
                    .setCustomId('rightdown')
                    .setLabel('Prawo dół')
                    .setStyle('PRIMARY')
            )

        interaction.reply({files: [attachment], components: [row1, row2, row3]})
  }
}