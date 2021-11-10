const Board=require('../pilkarzykiRenderer.js')
const Discord = require('discord.js')
const fs=require('fs')
const Elo=require('elo-rating')
const { SlashCommandBuilder, SlashCommandUserOption } = require('@discordjs/builders')

var uids={}
var boards={}
var gameID=1
var accepts=[]

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
                    .setCustomId('pilkarzyki#0')
                    .setLabel('Lewo góra')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(0)),
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#1')
                    .setLabel('Góra')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(1)),
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#2')
                    .setLabel('Prawo góra')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(2))
            )
        var row2=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#3')
                    .setLabel('Lewo     ')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(3)),
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#disabled')
                    .setLabel(' ')
                    .setStyle(style)
                    .setDisabled(true),
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#4')
                    .setLabel('Prawo     ')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(4))
            )
        var row3=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#5')
                    .setLabel('Lewo dół')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(5)),
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#6')
                    .setLabel('Dół')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(6)),
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#7')
                    .setLabel('Prawo dół')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(7))
            )
        var row4=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#remis')
                    .setLabel('Remis')
                    .setStyle('SECONDARY'),
                new Discord.MessageButton()
                    .setCustomId('pilkarzyki#surrender')
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
            interaction.customId=interaction.customId.slice(interaction.customId.indexOf('#')+1)
            if(interaction.customId.startsWith('accept'))
            {
                if(interaction.customId.startsWith('acceptNo'))
                {
                    var uidsButton=interaction.customId.split('#')
                    if(uidsButton[2]!=interaction.user.id)
                        return
                    var uid1=uidsButton[1]
                    var uid2=uidsButton[2]

                    for(var i=0; i<accepts.length; i++)
                    {
                        var accept=accepts[i]
                        if(accept['uidToAccept']==uid2 && accept['acceptFrom']==uid1)
                        {
                            var msg=accept['usernames'][1]+' nie zaakceptował gry z '+accept['usernames'][0]
                            await accept['message'].edit({content: msg, components: []})
                            accepts.splice(i, 1)
                            return
                        }
                    }
                }
                else
                {
                    var uidsButton=interaction.customId.split('#')
                    if(uidsButton[2]!=interaction.user.id)
                        return
                    var uid1=uidsButton[1]
                    var uid2=uidsButton[2]

                    var rightAccept=undefined
                    for(var i=0; i<accepts.length; i++)
                    {
                        var accept=accepts[i]
                        if(accept['uidToAccept']==uid2 && accept['acceptFrom']==uid1)
                        {
                            rightAccept=accept
                            break
                        }
                    }
                    if(rightAccept===undefined)
                        return

                    var newAccepts=[]
                    for(var i=0; i<accepts.length; i++)
                    {
                        if(accepts[i]['fromAccept']!=uid1 && accepts[i]['uidToAccept']!=uid2)
                            newAccepts.push(accepts[i])
                        else
                        {
                            // if(accepts[i]['fromAccept']==uid1 && accepts[i]['uidToAccept']==uid2)
                            //     continue
                            
                            accepts[i]['message'].edit({content: accepts[i]['message'].content, components: []})
                        }
                    }
                    accepts=newAccepts

                    uids[uid1]=gameID
                    uids[uid2]=gameID
                    
                    boards[gameID]=new Board(50, 50, 50, [uid1, uid2], rightAccept.usernames, gameID)
                    var id=gameID
                    gameID++
                    
                    for(var i=1; i<=10; i++)
                    {
                        try {
                            boards[id].draw()
                            break
                        } catch(error) {
                            console.log('Draw failed '+i+'. time(s) color: '+boards[id].lastColor+' '+boards[id].lastColor.toString(16))
                            if(i==10)
                                console.log(error)
                        }
                    }
                    const attachment = new Discord.MessageAttachment('./data/boardPilkarzyki'+id+'.png')
                    var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
                    
                    var msg='Tura: <@'+boards[id].turnUID()+'>\n'+img.attachments.first().url

                    var error=false
                    do {
                        try {
                            var message=await interaction.update({content: msg, files: [], components: buttons(id)})
                            boards[id].message=message
                        } catch(err) {
                            error=true
                            console.log(err)
                        }
                    } while(error)
                }
            }
            if(uids[interaction.user.id]===undefined)
                return

            if(interaction.customId=='surrender')
            {
                var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                var gameuids=boards[uids[interaction.user.id]].uids

                var tempuids=[...gameuids]
                var uidsString=""
                for(var uid of tempuids.sort())
                    uidsString+=uid+'#'
                uidsString=uidsString.substring(0, uidsString.length-1)
                
                if(ranking['najdluzszagrapilkarzyki'][uidsString]===undefined)
                    ranking['najdluzszagrapilkarzyki'][uidsString]=0
                ranking['najdluzszagrapilkarzyki'][uidsString]=Math.max(boards[uids[interaction.user.id]].totalMoves, ranking['najdluzszagrapilkarzyki'][uidsString])

                var rating1=ranking['pilkarzyki'][gameuids[0]]['rating']
                var rating2=ranking['pilkarzyki'][gameuids[1]]['rating']
                
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

                ranking['pilkarzyki'][gameuids[0]]['rating']=newRating['playerRating']
                ranking['pilkarzyki'][gameuids[1]]['rating']=newRating['opponentRating']

                ranking['pilkarzyki'][interaction.user.id]['lost']++
                ranking['pilkarzyki'][winner]['won']++
                fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

                for(var i=1; i<=10; i++)
                {
                    try {
                        boards[uids[interaction.user.id]].draw()
                        break
                    } catch(error) {
                        console.log('Draw failed '+i+'. time(s) color: '+boards[uids[interaction.user.id]].lastColor+' '+boards[uids[interaction.user.id]].lastColor.toString(16))
                        if(i==10)
                            console.log(error)
                    }
                }
                const attachment = new Discord.MessageAttachment('./data/boardPilkarzyki'+uids[interaction.user.id]+'.png')
                var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
                var msg='<@'+winner+'> wygrał przez poddanie się\n'+img.attachments.first().url 

                var error=false
                do {
                    try {
                        var message=await interaction.update({content: msg, files: [], components: []}) 
                    } catch(err) {
                        error=true
                        console.log(err)
                    }
                } while(error)
                
                boards[uids[interaction.user.id]].removeBoard()
                delete boards[uids[interaction.user.id]]
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
                    for(var i=1; i<=10; i++)
                    {
                        try {
                            boards[uids[interaction.user.id]].draw()
                            break
                        } catch(error) {
                            console.log('Draw failed '+i+'. time(s) color: '+boards[uids[interaction.user.id]].lastColor+' '+boards[uids[interaction.user.id]].lastColor.toString(16))
                            if(i==10)
                                console.log(error)
                        }
                    }
                    const attachment = new Discord.MessageAttachment('./data/boardPilkarzyki'+uids[interaction.user.id]+'.png')
                    var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
                    var msg='Remis\n'+img.attachments.first().url

                    var error=false
                    do {
                        try {
                            var message=await interaction.update({content: msg, files: [], components: []})
                        } catch(err) {
                            error=true
                            console.log(err)
                        }
                    } while(error)
                    
                    var gameuids=boards[uids[interaction.user.id]].uids

                    var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                    var tempuids=[...gameuids]
                    var uidsString=""
                    for(var uid of tempuids.sort())
                        uidsString+=uid+'#'
                    uidsString=uidsString.substring(0, uidsString.length-1)

                    if(ranking['najdluzszagrapilkarzyki'][uidsString]===undefined)
                        ranking['najdluzszagrapilkarzyki'][uidsString]=0
                    ranking['najdluzszagrapilkarzyki'][uidsString]=Math.max(boards[uids[interaction.user.id]].totalMoves, ranking['najdluzszagrapilkarzyki'][uidsString])
                    fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

                    boards[uids[interaction.user.id]].removeBoard()
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
                
                boards[uids[interaction.user.id]].currentMoveLength++
                if(!boards[uids[interaction.user.id]].move(indexes.indexOf(parseInt(interaction.customId))))
                    return

                if(boards[uids[interaction.user.id]].turnUID()!=interaction.user.id)
                {
                    boards[uids[interaction.user.id]].longestMove[interaction.user.id]=Math.max(boards[uids[interaction.user.id]].currentMoveLength, boards[uids[interaction.user.id]].longestMove[interaction.user.id])
                    boards[uids[interaction.user.id]].currentMoveLength=0

                    ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                    if(ranking['najdluzszyruch'][interaction.user.id]===undefined)
                        ranking['najdluzszyruch'][interaction.user.id]=0
                    ranking['najdluzszyruch'][interaction.user.id]=Math.max(ranking['najdluzszyruch'][interaction.user.id], boards[uids[interaction.user.id]].longestMove[interaction.user.id])

                    fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))
                }
            }

            for(var i=1; i<=10; i++)
            {
                try {
                    boards[uids[interaction.user.id]].draw()
                    break
                } catch(error) {
                    console.log('Draw failed '+i+'. time(s) color: '+boards[uids[interaction.user.id]].lastColor+' '+boards[uids[interaction.user.id]].lastColor.toString(16))
                    if(i==10)
                        console.log(error)
                }
            }
            const attachment = new Discord.MessageAttachment('./data/boardPilkarzyki'+uids[interaction.user.id]+'.png')
            
            if(boards[uids[interaction.user.id]].win==-1)
            {
                var msg='Tura: <@'+boards[uids[interaction.user.id]].turnUID()+'> '

                if(boards[uids[interaction.user.id]].remis.length>0)
                {
                    msg+=' ('+boards[uids[interaction.user.id]].remis.length+'/2 osoby poprosiły o remis)'
                }
            }
            else
                var msg='<@'+boards[uids[interaction.user.id]].uids[boards[uids[interaction.user.id]].win]+'> wygrał'
            
            if(boards[uids[interaction.user.id]].win==-1)
                var components=buttons(uids[interaction.user.id])
            else
                var components=[]
            
            // boards[uids[interaction.user.id]].message.edit({components: []})
            var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})

            // var message=await boards[uids[interaction.user.id]].message.channel.send({content: msg, files: [attachment], components: components})
            msg+='\n'+img.attachments.first().url

            var error=false
            do {
                try {
                    var message=await interaction.update({content: msg, files: [], components: components})
                    boards[uids[interaction.user.id]].message=message
                } catch(err) {
                    error=true
                    console.log(err)
                }
            } while(error)
            
            if(boards[uids[interaction.user.id]].win!=-1)
            {
                var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                var gameuids=boards[uids[interaction.user.id]].uids

                var tempuids=[...gameuids]
                var uidsString=""
                    for(var uid of tempuids.sort())
                        uidsString+=uid+'#'
                uidsString=uidsString.substring(0, uidsString.length-1)

                if(ranking['najdluzszagrapilkarzyki'][uidsString]===undefined)
                    ranking['najdluzszagrapilkarzyki'][uidsString]=0
                ranking['najdluzszagrapilkarzyki'][uidsString]=Math.max(boards[uids[interaction.user.id]].totalMoves, ranking['najdluzszagrapilkarzyki'][uidsString])
                
                var player1=ranking['pilkarzyki'][gameuids[0]]['rating']
                var player2=ranking['pilkarzyki'][gameuids[1]]['rating']

                if(boards[uids[interaction.user.id]].win==0)
                {
                    var newRating=Elo.calculate(player1, player2, true)
                    ranking['pilkarzyki'][gameuids[0]]['won']++
                    ranking['pilkarzyki'][gameuids[1]]['lost']++
                }
                else
                {
                    var newRating=Elo.calculate(player1, player2, false)
                    ranking['pilkarzyki'][gameuids[0]]['lost']++
                    ranking['pilkarzyki'][gameuids[1]]['won']++
                }

                ranking['pilkarzyki'][gameuids[0]]['rating']=newRating['playerRating']
                ranking['pilkarzyki'][gameuids[1]]['rating']=newRating['opponentRating']

                fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

                boards[uids[interaction.user.id]].removeBoard()
                delete boards[uids[interaction.user.id]]
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
            interaction.reply('Już grasz w grę')
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
        if(ranking['pilkarzyki'][uid1]===undefined)
            ranking['pilkarzyki'][uid1]={lost: 0, won: 0}
        if(ranking['pilkarzyki'][uid1]['rating']===undefined)
            ranking['pilkarzyki'][uid1]['rating']=1500

        if(ranking['pilkarzyki'][uid2]===undefined)
            ranking['pilkarzyki'][uid2]={lost: 0, won: 0}
        if(ranking['pilkarzyki'][uid2]['rating']===undefined)
            ranking['pilkarzyki'][uid2]['rating']=1500
        
        fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

        for(var i=0; i<accepts.length; i++)
        {
            if(accepts[i]['uidToAccept']==uid2 && accepts[i]['acceptFrom']==uid1)
            {
                await interaction.reply({content: 'Już wyzwałeś tą osobę.'})
                return
            }
        }

        var newAccept={usernames: usernames, uids: uids, uidToAccept: uid2, acceptFrom: uid1}

        var row=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setLabel('Tak')
                    .setCustomId('pilkarzyki#acceptYes#'+uid1+'#'+uid2)
                    .setStyle('PRIMARY'),
                new Discord.MessageButton()
                    .setLabel('Nie')
                    .setCustomId('pilkarzyki#acceptNo#'+uid1+'#'+uid2)
                    .setStyle('PRIMARY')
            )

        var msg="<@"+uid2+'>: '+usernames[0]+' chce z tobą zagrać'

        var error=false
        do {
            try {
                var message=await interaction.reply({content: msg, components: [row], fetchReply: true})
                newAccept['message']=message
            } catch(err) {
                error=true
                console.log(err)
            }
        } while(error)
        accepts.push(newAccept)
  }
}
