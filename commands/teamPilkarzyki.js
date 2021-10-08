const Board=require('../teamPilkarzykiRenderer.js')
const Discord = require('discord.js')
const fs=require('fs')
const Elo=require('elo-rating')
const { SlashCommandBuilder, SlashCommandUserOption } = require('@discordjs/builders')
const { execute } = require('./pilkarzyki.js')

var uids={}
var boards={}
var gameID=1
var accepts={}
var newAcceptID=1

function buttons(id)
{
    var indexes=boards[id].possibleMoveIndexes()
    if(boards[id].turn%2==0)
        var style='PRIMARY'
    else
        var style='DANGER'

    var row1=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#0')
                    .setLabel('Lewo góra')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(0)),
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#1')
                    .setLabel('Góra')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(1)),
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#2')
                    .setLabel('Prawo góra')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(2))
            )
        var row2=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#3')
                    .setLabel('Lewo     ')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(3)),
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#disabled')
                    .setLabel(' ')
                    .setStyle(style)
                    .setDisabled(true),
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#4')
                    .setLabel('Prawo     ')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(4))
            )
        var row3=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#5')
                    .setLabel('Lewo dół')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(5)),
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#6')
                    .setLabel('Dół')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(6)),
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#7')
                    .setLabel('Prawo dół')
                    .setStyle(style)
                    .setDisabled(!indexes.includes(7))
            )
        var row4=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#remis')
                    .setLabel('Remis')
                    .setStyle('SECONDARY'),
                new Discord.MessageButton()
                    .setCustomId('teampilkarzyki#surrender')
                    .setLabel('Poddaj się')
                    .setStyle('SECONDARY')
            )

    return [row1, row2, row3, row4]
}

module.exports={
    data: new SlashCommandBuilder()
        .setName('teampilkarzyki')
        .setDescription('Piłkarzyki drużynowe')
        .addUserOption(
            new SlashCommandUserOption()
                .setName('gracz2')
                .setDescription('Drugi gracz (razem z tobą w drużynie)')
                .setRequired(true)
            )
        .addUserOption(
            new SlashCommandUserOption()
                .setName('gracz3')
                .setDescription('Trzeci gracz (w przeciwnej drużynie)')
                .setRequired(true)
        )
        .addUserOption(
            new SlashCommandUserOption()
                .setName('gracz4')
                .setDescription('Czwarty gracz (w przeciwnej drużynie)')
                .setRequired(true)
        ),
    async execute(interaction, args) {
        if(interaction.isButton!==undefined && interaction.isButton())
        {
            interaction.customId=interaction.customId.slice(interaction.customId.indexOf('#')+1)
            if(interaction.customId.startsWith('accept'))
            {
                if(interaction.customId.startsWith('acceptNo'))
                {
                    var uidsButton=interaction.customId.split('#')
                    var acceptID=uidsButton[1]
                    if(!accepts[acceptID]['uids'].includes(interaction.user.id))
                        return

                    if(accepts[acceptID]['uids'].includes(interaction.user.id))
                    {
                        var msg=interaction.user.username+' nie zaakceptował gry'
                        await accepts[acceptID]['message'].edit({content: msg, components: []})
                        delete accepts[acceptID]
                        return
                    }
                }
                else
                {
                    var uidsButton=interaction.customId.split('#')
                    var acceptID=uidsButton[1]
                    if(!accepts[acceptID]['uids'].includes(interaction.user.id))
                        return

                    if(accepts[acceptID]['accepted']===undefined)
                        accepts[acceptID]['accepted']=[]

                    if(accepts[acceptID]['accepted'].includes(interaction.user.id))
                        return
                    
                    accepts[acceptID]['accepted'].push(interaction.user.id)
                    if(accepts[acceptID]['accepted'].length!=4)
                    {
                        var guids=accepts[acceptID]['uids']
                        var msg='Drużynowe piłarzyki: <@'+guids[0]+'> i <@'+guids[2]+'> przeciwko <@'+guids[1]+'> i <@'+guids[3]+'> ('+accepts[acceptID]['accepted'].length+'/4 osób zaakceptowało)'
                        var buttonsID=acceptID

                        var row=new Discord.MessageActionRow()
                            .addComponents(
                                new Discord.MessageButton()
                                    .setLabel('Tak')
                                    .setCustomId('teampilkarzyki#acceptYes#'+buttonsID)
                                    .setStyle('PRIMARY'),
                                new Discord.MessageButton()
                                    .setLabel('Nie')
                                    .setCustomId('teampilkarzyki#acceptNo#'+buttonsID)
                                    .setStyle('PRIMARY')
                            )
                        // accepts[acceptID]['message'].edit({content: msg, components: [row]})
                        interaction.update({content: msg, components: [row]})
                        return
                    }

                    var accept=accepts[acceptID]
                    delete accepts[acceptID]

                    for(var uid of accept['uids'])
                    {
                        for(var [key, value] of Object.entries(accepts))
                        {
                            if(value['uids'].includes(uid))
                            {
                                value['message'].edit({content: value['message'].content, components: []})
                                delete accepts[key]
                            }
                        }
                    }

                    for(var uid of accept['uids'])
                        uids[uid]=gameID

                    boards[gameID]=new Board(50, 50, 50, accept['uids'], accept['usernames'], gameID)
                    var id=gameID
                    gameID++

                    boards[id].draw()
                    const attachment=new Discord.MessageAttachment('./data/boardTeamPilkarzyki'+id+'.png')
                    var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})

                    var msg='Tura: <@'+boards[id].turnUID()+'>\n'+img.attachments.first().url

                    var message=await interaction.update({content: msg, files: [], components: buttons(id)})
                    boards[id].message=message
                }
            }
            if(uids[interaction.user.id]===undefined)
                return

            if(interaction.customId=='surrender')
            {
                var boardID=uids[interaction.user.id]

                if(boards[boardID].surrender[boards[boardID].uids.indexOf(interaction.user.id)%2].includes(interaction.user.id))
                    return

                boards[boardID].surrender[boards[boardID].uids.indexOf(interaction.user.id)%2].push(interaction.user.id)

                if(boards[boardID].surrender[boards[boardID].uids.indexOf(interaction.user.id)%2].length==2)
                {
                    var losers=boards[boardID].uids.indexOf(interaction.user.id)%2
                    var winners=(losers+1)%2

                    boards[boardID].draw()
                    const attachment = new Discord.MessageAttachment('./data/boardTeamPilkarzyki'+uids[interaction.user.id]+'.png')
                    var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
                    
                    var msg="<@"+boards[boardID].uids[losers]+'> i <@'+boards[boardID].uids[losers+2]+'> poddali się\n'+img.attachments.first().url
                    await interaction.update({content: msg, components: []})

                    var wholeRanking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                    var ranking=wholeRanking['teampilkarzyki']
                    var guids=boards[boardID].uids

                    var tempuids=[...guids]
                    var uidsString=""
                    for(uid of tempuids.sort())
                        uidsString+=uid+'#'
                    uidsString=uidsString.substring(0, uidsString.length-1)

                    if(wholeRanking['najdluzszagrateampilkarzyki'][uidsString]===undefined)
                        wholeRanking['najdluzszagrateampilkarzyki'][uidsString]=0
                    wholeRanking['najdluzszagrateampilkarzyki'][uidsString]=Math.max(boards[boardID].totalMoves, wholeRanking['najdluzszagrateampilkarzyki'][uidsString])

                    var losersAverage=(ranking[guids[losers]]['rating']+ranking[guids[losers+2]]['rating'])/2
                    var winnersAverage=(ranking[guids[winners]]['rating']+ranking[guids[winners+2]]['rating'])/2

                    ranking[guids[winners]]['rating']=Elo.calculate(ranking[guids[winners]]['rating'], losersAverage, true)['playerRating']
                    ranking[guids[winners+2]]['rating']=Elo.calculate(ranking[guids[winners+2]]['rating'], losersAverage, true)['playerRating']

                    ranking[guids[losers]]['rating']=Elo.calculate(ranking[guids[losers]]['rating'], winnersAverage, false)['playerRating']
                    ranking[guids[losers+2]]['rating']=Elo.calculate(ranking[guids[losers+2]]['rating'], winnersAverage, false)['playerRating']

                    ranking[guids[losers]]['lost']++
                    ranking[guids[losers+2]]['lost']++
                    ranking[guids[winners]]['won']++
                    ranking[guids[winners+2]]['won']++

                    wholeRanking['teampilkarzyki']=ranking
                    fs.writeFileSync('./data/ranking.json', JSON.stringify(wholeRanking))

                    boards[boardID].removeBoard()
                    for(uid of boards[boardID].uids)
                        delete uids[uid]
                    delete boards[boardID]

                    return
                }
            }
            else if(interaction.customId=='remis')
            {
                var boardID=uids[interaction.user.id]
                if(boards[boardID].remis.includes(interaction.user.id))
                    return

                boards[boardID].remis.push(interaction.user.id)
                if(boards[boardID].remis.length==4)
                {
                    boards[boardID].draw()
                    const attachment = new Discord.MessageAttachment('./data/boardTeamPilkarzyki'+uids[interaction.user.id]+'.png')
                    var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
                    var msg='Remis\n'+img.attachments.first().url
                    await interaction.update({content: msg, components: []})

                    var wholeRanking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                    var guids=boards[boardID].uids

                    var tempuids=[...guids]
                    var uidsString=""
                        for(uid of tempuids.sort())
                            uidsString+=uid+'#'
                    uidsString=uidsString.substring(0, uidsString.length-1)
                    
                    if(wholeRanking['najdluzszagrateampilkarzyki'][uidsString]===undefined)
                        wholeRanking['najdluzszagrateampilkarzyki'][uidsString]=0
                    wholeRanking['najdluzszagrateampilkarzyki'][uidsString]=Math.max(boards[boardID].totalMoves, wholeRanking['najdluzszagrateampilkarzyki'][uidsString])
                    fs.writeFileSync('./data/ranking.json', JSON.stringify(wholeRanking))
                    
                    boards[boardID].removeBoard()
                    for(uid of boards[boardID].uids)
                        delete uids[uid]
                    delete boards[boardID]

                    return
                }
            }
            else 
            {
                var boardID=uids[interaction.user.id]

                if(interaction.user.id!=boards[boardID].turnUID())
                    return

                var indexes=boards[boardID].possibleMoveIndexes()
                if(!indexes.includes(parseInt(interaction.customId)))
                    return
                
                boards[boardID].currentMoveLength++
                if(!boards[boardID].move(indexes.indexOf(parseInt(interaction.customId))))
                    return

                if(boards[boardID].turnUID()!=interaction.user.id)
                {
                    boards[boardID].longestMove[interaction.user.id]=Math.max(boards[boardID].currentMoveLength, boards[boardID].longestMove[interaction.user.id])
                    boards[boardID].currentMoveLength=0

                    ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                    if(ranking['najdluzszyruch'][interaction.user.id]===undefined)
                        ranking['najdluzszyruch'][interaction.user.id]=0
                    ranking['najdluzszyruch'][interaction.user.id]=Math.max(ranking['najdluzszyruch'][interaction.user.id], boards[boardID].longestMove[interaction.user.id])

                    fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))
                }
            }

            boards[boardID].draw()
            
            if(boards[boardID].win==-1)
            {
                var components=buttons(boardID)
                var msg='Tura: <@'+boards[boardID].turnUID()+'> '
                if(boards[boardID].remis.length>0)
                    msg+=' ('+boards[boardID].remis.length+'/4 osoby poprosiły o remis) '

                for(var i=0; i<=1; i++)
                    if(boards[boardID].surrender[i].length==1)
                        msg+=' (<@'+boards[boardID].surrender[i]+'> głosuje za poddaniem się)'
            }
            else
            {
                var components=[]
                var msg='<@'+boards[boardID].uids[boards[boardID].win]+'> i <@'+boards[boardID].uids[boards[boardID].win+2]+'> wygrali'
            }

            const attachment = new Discord.MessageAttachment('./data/boardTeamPilkarzyki'+boardID+'.png')
            var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})

            msg+='\n'+img.attachments.first().url
            var message=await interaction.update({content: msg, components: components})
            boards[boardID].message=message

            if(boards[boardID].win!=-1)
            {
                var winners=boards[boardID].win
                var losers=(winners+1)%2

                var wholeRanking=JSON.parse(fs.readFileSync('./data/ranking.json'))
                var ranking=wholeRanking['teampilkarzyki']
                var guids=boards[boardID].uids

                var tempuids=[...guids]
                var uidsString=""
                    for(uid of tempuids.sort())
                        uidsString+=uid+'#'
                uidsString=uidsString.substring(0, uidsString.length-1)

                if(wholeRanking['najdluzszagrateampilkarzyki'][uidsString]===undefined)
                    wholeRanking['najdluzszagrateampilkarzyki'][uidsString]=0
                wholeRanking['najdluzszagrateampilkarzyki'][uidsString]=Math.max(boards[boardID].totalMoves, wholeRanking['najdluzszagrateampilkarzyki'][uidsString])

                var losersAverage=(ranking[guids[losers]]['rating']+ranking[guids[losers+2]]['rating'])/2
                var winnersAverage=(ranking[guids[winners]]['rating']+ranking[guids[winners+2]]['rating'])/2

                ranking[guids[winners]]['rating']=Elo.calculate(ranking[guids[winners]]['rating'], losersAverage, true)['playerRating']
                ranking[guids[winners+2]]['rating']=Elo.calculate(ranking[guids[winners+2]]['rating'], losersAverage, true)['playerRating']

                ranking[guids[losers]]['rating']=Elo.calculate(ranking[guids[losers]]['rating'], winnersAverage, false)['playerRating']
                ranking[guids[losers+2]]['rating']=Elo.calculate(ranking[guids[losers+2]]['rating'], winnersAverage, false)['playerRating']

                ranking[guids[losers]]['lost']++
                ranking[guids[losers+2]]['lost']++
                ranking[guids[winners]]['won']++
                ranking[guids[winners+2]]['won']++

                wholeRanking['teampilkarzyki']=ranking
                fs.writeFileSync('./data/ranking.json', JSON.stringify(wholeRanking))

                boards[boardID].removeBoard()
                for(uid of boards[boardID].uids)
                    delete uids[uid]
                delete boards[boardID]
            }

            return
        }

        if(interaction.isCommand!==undefined && interaction.isCommand())
        {
            var gracz1=interaction.user
            var gracz2=interaction.options.getUser('gracz2')
            var gracz3=interaction.options.getUser('gracz3')
            var gracz4=interaction.options.getUser('gracz4')

            var guids=[gracz1.id, gracz3.id, gracz2.id, gracz4.id]
            var usernames=[gracz1.username, gracz3.username, gracz2.username, gracz4.username]
        }
        else
        {
            if(args===undefined)
                return
            if(args.length>=1 && args[0]=='save')
            {
                for([key, value] of Object.entries(boards))
                {
                    value.dump(key)
                }
                return
            }

            if(args.length<3 || interaction.mentions.users.length==0)
            {
                interaction.reply('Format: ty z graczem1 przeciwko graczowi2 z graczem3')
                return
            }

            var guids=new Array(4)
            var usernames=new Array(4)

            guids[0]=interaction.author.id
            usernames[0]=interaction.author.username
            i=1
            for(var [uid, value] of interaction.mentions.users.entries())
            {
                if(i==1)
                {
                    guids[2]=uid
                    usernames[2]=value.username
                }
                else if(i==2)
                {
                    guids[1]=uid
                    usernames[1]=value.username
                }
                else if(i==3)
                {
                    guids[3]=uid
                    usernames[3]=value.username
                }
                i++
            }
        }

        if(uids[guids[0]]!==undefined)
        {
            interaction.reply('Już grasz w grę')
            return
        }
        for(var i=1; i<=3; i++)
        {
            if(uids[guids[i]]!==undefined)
            {
                interaction.reply('<@'+guids[i]+'> już gra w grę')
                return
            }
        }

        var check={}
        for(var uid of guids)
        {
            if(check[uid])
            {
                interaction.reply('Osoby nie mogą się powtarzać')
                return
            }
            check[uid]=true
        }

        var wholeRanking=JSON.parse(fs.readFileSync('./data/ranking.json'))
        var ranking=wholeRanking['teampilkarzyki']
        
        for(var uid of guids)
            if(ranking[uid]===undefined)
                ranking[uid]={lost: 0, won: 0, rating: 1500}

        wholeRanking['teampilkarzyki']=ranking
        fs.writeFileSync('./data/ranking.json', JSON.stringify(wholeRanking))

        var newAccept={usernames: usernames, uids: guids, accepted: []}
        
        var buttonsID=newAcceptID
        
        var row=new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setLabel('Tak')
                    .setCustomId('teampilkarzyki#acceptYes#'+buttonsID)
                    .setStyle('PRIMARY'),
                new Discord.MessageButton()
                    .setLabel('Nie')
                    .setCustomId('teampilkarzyki#acceptNo#'+buttonsID)
                    .setStyle('PRIMARY')
            )
        
        var msg='Drużynowe piłarzyki: <@'+guids[0]+'> i <@'+guids[2]+'> przeciwko <@'+guids[1]+'> i <@'+guids[3]+'>'    
        var message=await interaction.reply({content: msg, components: [row]})

        newAccept['message']=message
        accepts[newAcceptID]=newAccept
        newAcceptID++
    }
}
