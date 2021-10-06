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
            .addChoice('TeamPilkarzyki', 'teampilkarzyki')
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
            if(!['pilkarzyki', 'kwadraty', 'teampilkarzyki'].includes(args[0]))
            {
                interaction.reply('Zła gra')
                return
            }
            var type=args[0]
        }

        var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))[type]
        var rank=[]
    
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

        if(type=='pilkarzyki')
            var title='Ranking piłkarzyków'
        else if(type=='kwadraty')
            var title='Ranking kwadratów'
        else if(type=='teampilkarzyki')
            var title='Ranking drużynowych piłkarzyków'
        embed=new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(title)
            .setDescription(desc)
        
        interaction.reply({embeds: [embed]})
  }
}
