'use strict'

const Discord = require('discord.js')
const { SlashCommandBuilder, SlashCommandStringOption, SlashCommandUserOption } = require('@discordjs/builders')
const fs = require('fs')
const settings = require('../data/settings.json')
const config = require('../config.json')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('Różne ustawienia bota')
        .addSubcommand(subcommand =>
            subcommand
                .setName('guild')
                .setDescription('Ustawienia dotyczące tej gildii (lub innej wsm też)')
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('option')
                        .setDescription('różne opcje')
                        .setRequired(true)
                        .addChoice('block jajco', 'banjajco')
                        .addChoice('unblock jajco', 'unbanjajco')
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('additional')
                        .setDescription('Dodatkowe informacji (np. id guildi)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')    
                .setDescription('Ustawienia dotyczące użytkownika')
                .addUserOption(
                    new SlashCommandUserOption()
                        .setName('user')
                        .setDescription('Użytkownik')
                        .setRequired(true)
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName('option')
                        .setDescription('Opcje')
                        .setRequired(true)
                        .addChoice('ban jajco', 'banjajco')
                        .addChoice('unban jajco', 'unbanjajco')
                )
        ),
    async execute(interaction) {
        if (config.adminID != interaction.user.id)
            return

        if (!settings.jajco)
            settings.jajco = {}
        if (!settings.jajco.bannedGuilds)
            settings.jajco.bannedGuilds = []
        if (!settings.jajco.bannedUsers)
            settings.jajco.bannedUsers = []

        
        if (interaction.options.getSubcommand() === 'guild')
        {
            var option = interaction.options.getString('option')
            var additional = interaction.options.getString('additional')

            if (option == 'banjajco')
            {
                if (!settings.jajco.bannedGuilds.includes( (additional ? additional : interaction.guild.id) ))
                {
                    settings.jajco.bannedGuilds.push( (additional ? additional : interaction.guild.id) )
                    fs.writeFileSync('./data/settings.json', JSON.stringify(settings, null, 2))
                }
                interaction.reply('ok')
            }
            else if (option == 'unbanjajco')
            {
                if (settings.jajco.bannedGuilds.includes( (additional ? additional : interaction.guild.id) ))
                {
                    settings.jajco.bannedGuilds.splice(settings.jajco.bannedGuilds.indexOf((additional ? additional : interaction.guild.id)), 1)
                    fs.writeFileSync('./data/settings.json', JSON.stringify(settings, null, 2))
                }
                interaction.reply('ok')
            }
        }

        if (interaction.options.getSubcommand() === 'user')
        {
            var option = interaction.options.getString('option')
            var user = interaction.options.getUser('user')

            if (option == 'banjajco')
            {
                if (!settings.jajco.bannedUsers.includes(user.id))
                {
                    settings.jajco.bannedUsers.push(user.id)
                    fs.writeFileSync('./data/settings.json', JSON.stringify(settings, null, 2))
                }
                interaction.reply('ok')
            }
            else if (option == 'unbanjajco')
            {
                if (settings.jajco.bannedUsers.includes(user.id))
                {
                    settings.jajco.bannedUsers.splice(settings.jajco.bannedUsers.indexOf(user.id), 1)
                    fs.writeFileSync('./data/settings.json', JSON.stringify(settings, null, 2))
                }
                interaction.reply('ok')
            }
        }
    }
}