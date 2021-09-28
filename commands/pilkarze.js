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
        interaction.reply({files: [attachment]})
  }
}