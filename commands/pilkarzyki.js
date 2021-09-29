const Board=require('../renderer.js')
const Discord = require('discord.js')

var uids={}
var boards=[]

function buttons(id)
{
    var indexes=boards[id].possibleMovesIndexes()

    var row1=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('0')
                    .setLabel('Lewo góra')
                    .setStyle('PRIMARY')
                    .setDisabled(!indexes.includes(0)),
                new Discord.MessageButton()
                    .setCustomId('1')
                    .setLabel('Góra')
                    .setStyle('PRIMARY')
                    .setDisabled(!indexes.includes(1)),
                new Discord.MessageButton()
                    .setCustomId('2')
                    .setLabel('Prawo góra')
                    .setStyle('PRIMARY')
                    .setDisabled(!indexes.includes(2))
            )
        var row2=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('3')
                    .setLabel('Lewo     ')
                    .setStyle('PRIMARY')
                    .setDisabled(!indexes.includes(3)),
                new Discord.MessageButton()
                    .setCustomId('disabled')
                    .setLabel(' ')
                    .setStyle('PRIMARY')
                    .setDisabled(true),
                new Discord.MessageButton()
                    .setCustomId('4')
                    .setLabel('Prawo     ')
                    .setStyle('PRIMARY')
                    .setDisabled(!indexes.includes(4))
            )
        var row3=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('5')
                    .setLabel('Lewo dół')
                    .setStyle('PRIMARY')
                    .setDisabled(!indexes.includes(5)),
                new Discord.MessageButton()
                    .setCustomId('6')
                    .setLabel('Dół')
                    .setStyle('PRIMARY')
                    .setDisabled(!indexes.includes(6)),
                new Discord.MessageButton()
                    .setCustomId('7')
                    .setLabel('Prawo dół')
                    .setStyle('PRIMARY')
                    .setDisabled(!indexes.includes(7))
            )

    return [row1, row2, row3]
}

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
                if(uids[interaction.user.id]===undefined)
                    return

                if(interaction.user.id!=boards[uids[interaction.user.id]].turnUID())
                    return
                
                var indexes=boards[uids[interaction.user.id]].possibleMovesIndexes()
                if(!indexes.includes(parseInt(interaction.customId)))
                    return
                
                if(!boards[uids[[interaction.user.id]]].move(indexes.indexOf(parseInt(interaction.customId))))
                {
                    return
                }

                boards[uids[[interaction.user.id]]].draw()
                const attachment = new Discord.MessageAttachment('./data/board.png')
                
                if(boards[uids[[interaction.user.id]]].win==-1)
                    var msg='Tura: <@'+boards[uids[[interaction.user.id]]].turnUID()+'>'
                else
                    var msg='<@'+boards[uids[[interaction.user.id]]].uids[boards[uids[[interaction.user.id]]].win]+'> wygrał'
                
                if(boards[uids[[interaction.user.id]]].win==-1)
                    var components=buttons(uids[[interaction.user.id]])
                else
                    var components=[]
                
                console.log(boards[uids[[interaction.user.id]]].message)
                boards[uids[[interaction.user.id]]].message.edit({components: []})
                var message=await boards[uids[[interaction.user.id]]].message.channel.send({content: msg, files: [attachment], components: components]})
                // var message=await interaction.update({content: msg, files: [attachment], components: buttons(uids[[interaction.user.id]])})
                boards[uids[[interaction.user.id]]].message=message

                // var indexes=boards[]
                // console.log(interaction)
                return
            }
        } catch(error) {
            console.log(error)
        }

        if(args===undefined)
        {
            // console.log('xdd')
            return
        }

        if(args.length<1 || interaction.mentions.users.length==0)
        {
            interaction.reply('Potrzebny jest drugi gracz')
            return
        }
        
        var uid1=interaction.author.id
        var uid2=interaction.mentions.users.keys().next().value
        // console.log(uid1, uid2)

        if(uid1===uid2)
        {
            interaction.reply('Nie możesz grać z samym sobą')
            return
        }

        uids[uid1]=boards.length
        uids[uid2]=boards.length
        boards.push(new Board(50, 50, 50, [uid1, uid2]))
        var id=boards.length-1
        
        boards[id].draw()
        const attachment = new Discord.MessageAttachment('./data/board.png')
        
        var msg='Tura: <@'+boards[id].turnUID()+'>'

        var message=await interaction.reply({content: msg, files: [attachment], components: buttons(id)})
        boards[id].message=message
  }
}