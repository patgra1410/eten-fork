const fs = require('fs')
const Discord = require('discord.js')

module.exports = {
  name: 'ranking',
  description: 'Ranking do piłkarzyków',
  async execute (interaction) {
        var ranking=JSON.parse(fs.readFileSync('./data/ranking.json'))
        var rank=[]
    
        for([key, value] of Object.entries(ranking))
            rank.push([value['won']/(value['won']+value['lost']), key])

        rank.sort(function(a,b) {
            if(a[0]<b[0])
                return 1
            if(a[0]>b[0])
                return -1
            return 0
        })

        console.log(interaction)

        var desc=""
        for(var i=0; i<rank.length; i++)
        {
            var r=rank[i]
            desc+=String(i+1)+". <@"+r[1]+">: "+String(Math.round(r[0]*100*10)/10)+'% wygranych meczów ('+ranking[r[1]]['won']+' wygranych, '+ranking[r[1]]['lost']+' przegranych)\n'
        }

        embed=new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Ranking piłkarzyków')
            .setDescription(desc)
        
        interaction.reply({embeds: [embed]})
  }
}
