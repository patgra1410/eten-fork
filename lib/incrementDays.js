'use strict'

const fs = require('fs')

function increment() {
	fs.writeFileSync('./data/uptime', (parseInt(fs.readFileSync('./data/uptime')) + 1).toString())
}

module.exports = function() {
	fs.writeFileSync('./data/uptime', '0')
	setInterval(increment, 24 * 60 * 60 * 1000)
}