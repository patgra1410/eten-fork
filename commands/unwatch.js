const { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } = require('@discordjs/builders')
const threadwatcher = require('../lib/threadwatcher')
const config = require('../config.json')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwatch')
    .setDescription('Manually unwatch a thread - use for threads that get derailed or are insanenly shit')
    .addStringOption(
      function stringopts () {
        const scso = new SlashCommandStringOption()
          .setName('board')
          .setDescription('Shortened board name')
          .setRequired(true)
        for (const element in config.allowedBoardsForTracking) {
          scso.addChoice(config.allowedBoardsForTracking[element], element)
        }
        return scso
      }
    )
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('thread_id')
        .setDescription('ID of the thread to be unwatched')
        .setRequired(true)
    ),
  async execute (interaction) {
    await interaction.deferReply()
    const board = interaction.options.getString('board')
    const threadID = interaction.options.getInteger('thread_id')
    await interaction.editReply(`${(await threadwatcher.unwatchThread(board, threadID)).response}`)
  }
}
