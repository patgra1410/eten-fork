const Board=require('../renderer.js')
const Discord = require('discord.js')
const fs=require('fs')
const Elo=require('elo-rating')
const { SlashCommandBuilder, SlashCommandMentionableOption, SlashCommandUserOption } = require('@discordjs/builders')

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
        var row4=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('remis')
                    .setLabel('Remis')
                    .setStyle('SECONDARY'),
                new Discord.MessageButton()
                    .setCustomId('surrender')
                    .setLabel('Poddaj się')
                    .setStyle('SECONDARY')
            )

    return [row1, row2, row3, row4]
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pilkarzyki')
        .setDescription('Pilkarzyki')
        .addUserOption(
            new SlashCommandUserOption()
                .setName('gracz')
                .setDescription('Drugi gracz')
                .setRequired(true)
            ),
    async execute (interaction, args) {
        if(interaction.isButton!==undefined && interaction.isButton())
        {
            if(uids[interaction.user.id]===undefined)
                return

            if(interaction.customId=='surrender')
            {
                var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                var gameuids=boards[uids[[interaction.user.id]]].uids

                var rating1=ranking[gameuids[0]]['rating']
                var rating2=ranking[gameuids[1]]['rating']
                
                if(gameuids[0]==interaction.user.id)
                {
                    var winner=gameuids[1]
                    var win=false
                }
                else
                {
                    var winner=gameuids[0]
                    var win=true
                }

                var newRating=Elo.calculate(rating1, rating2, win)

                ranking[gameuids[0]]['rating']=newRating['playerRating']
                ranking[gameuids[1]]['rating']=newRating['opponentRating']

                ranking[interaction.user.id]['lost']++
                ranking[winner]['won']++
                fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

                boards[uids[[interaction.user.id]]].draw()
                const attachment = new Discord.MessageAttachment('./data/board.png')
                var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
                var msg='<@'+winner+'> wygrał przez poddanie się\n'+img.attachments.first().url 
                var message=await interaction.update({content: msg, files: [], components: []}) 
                
                delete boards[uids[[interaction.user.id]]]
                delete uids[winner]
                delete uids[interaction.user.id]

                return
            }
            else if(interaction.customId=='remis')
            {
                if(boards[uids[interaction.user.id]].remis.includes(interaction.user.id))
                    return
                
                boards[uids[interaction.user.id]].remis.push(interaction.user.id)
                if(boards[uids[interaction.user.id]].remis.length==2)
                {
                    boards[uids[[interaction.user.id]]].draw()
                    const attachment = new Discord.MessageAttachment('./data/board.png')
                    var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
                    var msg='Remis\n'+img.attachments.first().url
                    var message=await interaction.update({content: msg, files: [], components: []})
                    
                    var gameuids=boards[uids[interaction.user.id]].uids
                    delete boards[uids[interaction.user.id]]
                    delete uids[gameuids[0]]
                    delete uids[gameuids[1]]
                    
                    return
                }
            }
            else
            {
                if(interaction.user.id!=boards[uids[interaction.user.id]].turnUID())
                    return
                
                var indexes=boards[uids[interaction.user.id]].possibleMovesIndexes()
                if(!indexes.includes(parseInt(interaction.customId)))
                    return
                
                if(!boards[uids[[interaction.user.id]]].move(indexes.indexOf(parseInt(interaction.customId))))
                {
                    return
                }
            }

            boards[uids[[interaction.user.id]]].draw()
            const attachment = new Discord.MessageAttachment('./data/board.png')
            
            if(boards[uids[[interaction.user.id]]].win==-1)
            {
                var msg='Tura: <@'+boards[uids[[interaction.user.id]]].turnUID()+'> '

                if(boards[uids[interaction.user.id]].remis.length>0)
                {
                    msg+=' ('+boards[uids[interaction.user.id]].remis.length+'/2 osoby poprosiły o remis)'
                }
            }
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
                
                var player1=ranking[gameuids[0]]['rating']
                var player2=ranking[gameuids[1]]['rating']

                if(boards[uids[[interaction.user.id]]].win==0)
                {
                    var newRating=Elo.calculate(player1, player2, true)
                    ranking[gameuids[0]]['won']++
                    ranking[gameuids[1]]['lost']++
                }
                else
                {
                    var newRating=Elo.calculate(player1, player2, false)
                    ranking[gameuids[0]]['lost']++
                    ranking[gameuids[1]]['won']++
                }

                ranking[gameuids[0]]['rating']=newRating['playerRating']
                ranking[gameuids[1]]['rating']=newRating['opponentRating']

                fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

                delete boards[uids[[interaction.user.id]]]
                delete uids[gameuids[0]]
                delete uids[gameuids[1]]
            }

            return
        }
        
        if (interaction.isCommand!==undefined && interaction.isCommand()) {
            var secondUser=interaction.options.getUser('gracz')
            var uid2=secondUser.id
            var uid1=interaction.user.id
            var usernames=[interaction.user.username, secondUser.username]
        } else {
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
            var uid2=interaction.mentions.users.keys().next().value
            var uid1=interaction.author.id
            var usernames=[interaction.author.username, interaction.mentions.users.entries().next().value[1].username]
        }
        

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

        var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
        if(ranking[uid1]===undefined)
            ranking[uid1]={lost: 0, won: 0}
        if(ranking[uid1]['rating']===undefined)
            ranking[uid1]['rating']=1500

        if(ranking[uid2]===undefined)
            ranking[uid2]={lost: 0, won: 0}
        if(ranking[uid2]['rating']===undefined)
            ranking[uid2]['rating']=1500
        
        fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

        uids[uid1]=gameID
        uids[uid2]=gameID
        
        boards[gameID]=new Board(50, 50, 50, [uid1, uid2], usernames)
        var id=gameID
        gameID++
        
        boards[id].draw()
        const attachment = new Discord.MessageAttachment('./data/board.png')
        var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
        
        var msg='Tura: <@'+boards[id].turnUID()+'>\n'+img.attachments.first().url

        var message=await interaction.reply({content: msg, files: [], components: buttons(id)})
        // var message=await interaction.reply({content: msg, files: [attachment], components: buttons(id)})
        boards[id].message=message
  }
}
