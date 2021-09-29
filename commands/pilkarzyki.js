const Board=require('../renderer.js')
const Discord = require('discord.js')
const fs=require('fs')

var uids={}
var boards={}
var gameID=1

function buttons(id)
{
    var indexes=boards[id].possibleMovesIndexes()
    if(boards[id].turn==0)
        var style='PRIMARY'
    else
        var style='DANGER'

    var row1=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('0')
                    .setLabel('Lewo góra')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(0)),
                new Discord.MessageButton()
                    .setCustomId('1')
                    .setLabel('Góra')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(1)),
                new Discord.MessageButton()
                    .setCustomId('2')
                    .setLabel('Prawo góra')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(2))
            )
        var row2=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('3')
                    .setLabel('Lewo     ')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(3)),
                new Discord.MessageButton()
                    .setCustomId('disabled')
                    .setLabel(' ')
                    .setStyle(style)
                    .setDisabled(true),
                new Discord.MessageButton()
                    .setCustomId('4')
                    .setLabel('Prawo     ')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(4))
            )
        var row3=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('5')
                    .setLabel('Lewo dół')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(5)),
                new Discord.MessageButton()
                    .setCustomId('6')
                    .setLabel('Dół')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(6)),
                new Discord.MessageButton()
                    .setCustomId('7')
                    .setLabel('Prawo dół')
                    .setStyle(style)
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
                
                // boards[uids[[interaction.user.id]]].message.edit({components: []})
                var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})

                // var message=await boards[uids[[interaction.user.id]]].message.channel.send({content: msg, files: [attachment], components: components})
                msg+='\n'+img.attachments.first().url
                var message=await interaction.update({content: msg, files: [], components: components})
                boards[uids[[interaction.user.id]]].message=message

                if(boards[uids[[interaction.user.id]]].win!=-1)
                {
                    var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                    var gameuids=boards[uids[[interaction.user.id]]].uids
                    
                    if(ranking[gameuids[0]]===undefined)
                        ranking[gameuids[0]]={lost: 0, won: 0}
                    if(ranking[gameuids[1]]===undefined)
                        ranking[gameuids[1]]={lost: 0, won: 0}
                    
                    if(boards[uids[[interaction.user.id]]].win==0)
                    {
                        ranking[gameuids[0]]['won']++
                        ranking[gameuids[1]]['lost']++
                    }
                    else
                    {
                        ranking[gameuids[0]]['lost']++
                        ranking[gameuids[1]]['won']++
                    }

                    fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

                    delete boards[uids[[interaction.user.id]]]
                    delete uids[gameuids[0]]
                    delete uids[gameuids[1]]
                }

                return
            }
        } catch(error) {
            console.log(error)
        }

        if(args===undefined)
        {
            return
        }

        if(args.length>=1 && args[0]=='save')
        {
            for([key, value] of Object.entries(boards))
            {
                value.dump(key)
            }
            return
        }

        if(args.length<1 || interaction.mentions.users.length==0)
        {
            interaction.reply('Potrzebny jest drugi gracz')
            return
        }
        
        var uid1=interaction.author.id
        var uid2=interaction.mentions.users.keys().next().value

        if(uids[uid1]!==undefined)
        {
            interaction.reply('Juz grasz grę')
            return
        }
        if(uids[uid2]!==undefined)
        {
            interaction.reply('<@'+uid2+'> już gra w grę')
            return
        }

        if(uid1===uid2)
        {
            interaction.reply('Nie możesz grać z samym sobą')
            return
        }

        uids[uid1]=gameID
        uids[uid2]=gameID
        
        boards[gameID]=new Board(50, 50, 50, [uid1, uid2], [interaction.author.username, interaction.mentions.users.entries().next().value[1].username])
        var id=gameID
        gameID++
        
        boards[id].draw()
        const attachment = new Discord.MessageAttachment('./data/board.png')
        var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
        
        var msg='Tura: <@'+boards[id].turnUID()+'>\n'+img.attachments.first().url

        var message=await interaction.reply({content: msg, files: [], components: buttons(id)})
        var message=await interaction.reply({content: msg, files: [attachment], components: buttons(id)})
        boards[id].message=message
  }
}