'use strict'

const fs = require('fs')

function increment() {
	fs.writeFileSync('./data/uptime', (parseInt(fs.readFileSync('./data/uptime')) + 1).toString())
}

module.exports = function() {
	if (!fs.existsSync('./data/uptime') || fs.existsSync('./data/crashed')) {
		fs.writeFileSync('./data/uptime', '0')

		if (fs.existsSync('./data/crashed'))
			fs.rmSync('./data/crashed')
	}

	setInterval(increment, 24 * 60 * 60 * 1000)
}