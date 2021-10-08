const fs = require('fs')
const Discord = require('discord.js')
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Rankingi gier')
    .addStringOption(
        new SlashCommandStringOption()
            .setName('gra')
            .setDescription('gra')
            .setRequired(true)
            .addChoice('Piłkarzyki', 'pilkarzyki')
            .addChoice('Kwadraty', 'kwadraty')
            .addChoice('Drużynowe Pilkarzyki', 'teampilkarzyki')
            .addChoice('Najdluższy ruch', 'najdluzszyruch')
            .addChoice('Najdluższa gra w drużynowych piłkarzykach', 'najdluzszagrateampilkarzyki')
            .addChoice('Najdluższa gra w piłkarzykach', 'najdluzszagrapilkarzyki')
    ),
  async execute (interaction, args) {
        if(interaction.isCommand!==undefined && interaction.isCommand())
            var type=interaction.options.getString('gra')
        else
        {
            if(args===undefined || args.length==0)
            {
                interaction.reply('Nie wybrałeś gry')
                return
            }
            if(!['pilkarzyki', 'kwadraty', 'teampilkarzyki', 'najdluzszyruch', 'najdluzszagrateampilkarzyki', 'najdluzszagrapilkarzyki'].includes(args[0]))
            {
                interaction.reply('Zła gra')
                return
            }
            var type=args[0]
        }

        var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))[type]
        var rank=[]
    
        
        if(type=='najdluzszagrapilkarzyki' || type=='najdluzszagrateampilkarzyki' || type=='najdluzszyruch')
        {
            for([key, value] of Object.entries(ranking))
                rank.push({uids: key, len: value})

            rank.sort(function(a, b) {
                return b['len']-a['len']
            })

            var desc=""
            if(type=='najdluzszyruch')
            {
                for(var i=0; i<rank.length; i++)
                {
                    var r=rank[i]
                    desc+=String(i+1)+'. <@'+r['uids']+'>: '+r['len']+' ruchów\n'
                }
            }
            else
            {
                for(var i=0; i<Math.min(10, rank.length); i++)
                {
                    var r=rank[i]
                    var uids=r['uids'].split('#')
                    var usrnames=""
                    if(type=='najdluzszagrapilkarzyki')
                        usrnames='<@'+uids[0]+'> i <@'+uids[1]+'>'
                    else
                        usrnames='<@'+uids[0]+'>, <@'+uids[1]+'>, <@'+uids[2]+'> i <@'+uids[3]+'>'
                    desc+=String(i+1)+'. '+usrnames+': '+r['len']+' ruchów\n'
                }
            }
        }
        else
        {
            for([key, value] of Object.entries(ranking))
            {
                if(value['rating']===undefined)
                    value['rating']=1500
                if(value['won']+value['lost']!=0)
                    rank.push({id: key, won: value['won'], lost: value['lost'], rating: value['rating']})
            }

            rank.sort(function(a,b) {
                if(b['rating']==a['rating'])
                    return (b['won']/(b['won']+b['lost']))-(a['won']/(a['won']+a['lost']))
                return b['rating']-a['rating'] 
            })

            var desc=""
            for(var i=0; i<rank.length; i++)
            {
                var r=rank[i]
                desc+=String(i+1)+". <@"+r['id']+"> ELO rating "+String(Math.round(r['rating']))+' ('+r['won']+' wygranych, '+r['lost']+' przegranych)\n'
            }
        }

        if(type=='pilkarzyki')
            var title='Ranking piłkarzyków'
        else if(type=='kwadraty')
            var title='Ranking kwadratów'
        else if(type=='teampilkarzyki')
            var title='Ranking drużynowych piłkarzyków'
        else if(type=='najdluzszagrapilkarzyki')
            var title='Ranking najdłuższych gier piłkarzyków (max 10)'
        else if(type=='najdluzszagrateampilkarzyki')
            var title='Ranking najdłuższych gier drużynowych piłkarzyków (max 10)'
        else if(type=='najdluzszyruch')
            var title='Ranking najdłuższych ruchów'
           
        embed=new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(title)
            .setDescription(desc)
        
        interaction.reply({embeds: [embed]})
  }
}
