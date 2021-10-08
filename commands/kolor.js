const fs = require('fs')
const Discord = require('discord.js')
const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders')
const Board=require('../pilkarzykiRenderer.js')

var possibleColors=["black", "silver", "gray", "white", "maroon", "red", "purple", "fuchsia", "green", "lime", "olive", "yellow", "navy", "blue", "teal", "aqua", "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen"]

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kolor')
    .setDescription('Zmienianie koloru w grach')
    .addSubcommand(subcommand =>
        subcommand
            .setName('zmien')
            .setDescription('Twój kolor w grach (hex albo nazwa css-owa)')
            .addStringOption(
                new SlashCommandStringOption()
                    .setName('kolor')
                    .setDescription('Kolor w grach')
                    .setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('reset')
            .setDescription('Resetuj swój kolor'))
    ,
  async execute (interaction, args) {
    if(interaction.isCommand!==undefined && interaction.isCommand())
    {
        if(interaction.options.getSubcommand()==='reset')
        {
            var settings=JSON.parse(fs.readFileSync('./data/userSettings.json'))
            if(settings[uid]!==undefined && settings[uid]['color']!==undefined)
                delete settings[uid]['color']
        
            interaction.reply('Zresetowano kolor')
            fs.writeFileSync('./data/userSettings.json', JSON.stringify(settings))
            return
        }
        var color=interaction.options.getString('kolor')
        var uid=interaction.user.id
        var username=interaction.user.username
    }
    else
    {
        if(args===undefined || args.length==0)
        {
            interaction.reply('Potrzebny kolor')
            return
        }

        if(args[0]=='zmien')
        {
            var color=args[1]
            var uid=interaction.author.id
            var username=interaction.author.username
        }
        else if(args[0]!='reset')
        {
            interaction.reply('Zła składnia komendy (pls używaj slash komend są wygodniejsze)')
            return
        }
    }

    var settings=JSON.parse(fs.readFileSync('./data/userSettings.json'))

    if(color=='default' || (args!==undefined && args[0]=='reset'))
    {
        if(settings[uid]!==undefined && settings[uid]['color']!==undefined)
            delete settings[uid]['color']
        
        interaction.reply('Zresetowano kolor')
        fs.writeFileSync('./data/userSettings.json', JSON.stringify(settings))
    }
    else
    {
        color=color.toLowerCase()
        if(color=='nigger')
            color='black'
        if(settings[uid]===undefined)
            settings[uid]={}
        if((/#([0-9,A-F,a-f]{3})/.test(color.substring(0,4)) && color.length==4) || (/#([0-9,A-F,a-f]{6})/.test(color.substring(0,7)) && color.length==7) || possibleColors.includes(color))
        {
            settings[uid]['color']=color
            fs.writeFileSync('./data/userSettings.json', JSON.stringify(settings))

            var board=new Board(50, 50, 50, [uid, ""], [username, ""], -1)
            board.move(4)
            board.turn=0
            board.draw()
            const attachment = new Discord.MessageAttachment('./data/boardPilkarzyki-1.png')
            var img=await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({files: [attachment]})
            board.removeBoard()

            interaction.reply('Pls jeden bajgiel.\nPreview: '+img.attachments.first().url)
        }
        else
            interaction.reply('Zły kolor')
    }
  }
}
