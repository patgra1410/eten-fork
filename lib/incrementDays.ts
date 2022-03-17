import fs from 'fs'

function increment() {
	fs.writeFileSync('./data/uptime', (parseInt(fs.readFileSync('./data/uptime', 'utf-8')) + 1).toString());
}

export default function() {
	if (!fs.existsSync('./data/uptime') || fs.existsSync('./data/crashed')) {
		fs.writeFileSync('./data/uptime', '0')

		if (fs.existsSync('./data/crashed'))
			fs.rmSync('./data/crashed')
	}

	setInterval(increment, 24 * 60 * 60 * 1000)
}