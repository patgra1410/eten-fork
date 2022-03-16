const { createCanvas } = require('canvas')
const { inspect } = require('util')
const fs = require('fs')

class Point {
	constructor(index, x, y, border = false, outside = true) {
		this.index = index
		this.x = x
		this.y = y
		this.border = border
		this.outside = outside
		this.edges = []
	}
}

class Edge {
	constructor(pointA, pointB, color = '#fff') {
		this.pointA = pointA
		this.pointB = pointB
		this.color = color
	}
}

module.exports = class Board {
	constructor(spacing, offsetX, offsetY, uids, usernames, id = 0) {
		this.spacing = spacing
		this.offsetX = offsetX
		this.offsetY = offsetY
		this.uids = uids
		this.usernames = usernames
		this.id = id

		this.surrender = [[], []]
		this.remis = []
		this.turn = 0
		this.win = -1
		this.thickness = 3
		this.totalMoves = 0
		this.longestMove = {}
		this.currentMoveLength = 0

		const settings = JSON.parse(fs.readFileSync('./data/userSettings.json'))
		this.colors = ['#5865f2', '#f04747', '#5865f2', '#f04747']

		for (let i = 0; i < this.uids.length; i++) {
			if (settings[this.uids[i]] !== undefined && settings[this.uids[i]]['color'] !== undefined)
				this.colors[i] = settings[this.uids[i]]['color']
		}

		for (const uid of this.uids)
			this.longestMove[uid] = 0

		this.ball = new Point(-1, 6, 6)

		this.canvas = createCanvas(offsetX * 2 + 10 * spacing, offsetY * 2 + 10 * spacing)
		this.ctx = this.canvas.getContext('2d')

		const points = []
		const pos = new Array(13)
		for (let i = 0; i < pos.length; i++)
			pos[i] = new Array(13)

		let ind = 0
		for (let y = 0; y <= 12; y++) {
			for (let x = 0; x <= 12; x++) {
				let outside = false
				if ((y == 1 && x >= 1 && x <= 4) || (y == 1 && x >= 8 && x <= 11) || (y == 11 && x >= 1 && x <= 4) || (y == 11 && x >= 8 && x <= 11) ||
                    (x == 1 && y >= 1 && y <= 4) || (x == 1 && y >= 8 && y <= 11) || (x == 11 && y >= 1 && y <= 4) || (x == 11 && y >= 8 && y <= 11) ||
                    (x == 2 && y == 2) || (x == 10 && y == 2) || (x == 2 && y == 10) || (x == 10 && y == 10) || y == 0 || y == 12 || x == 0 || x == 12)
					outside = true

				let border = false
				if ((y == 2 && x >= 3 && x <= 5) || (y == 2 && x >= 7 && x <= 9) || (y == 10 && x >= 3 && x <= 5) || (y == 10 && x >= 7 && x <= 9) ||
                    (x == 2 && y >= 3 && y <= 5) || (x == 2 && y >= 7 && y <= 9) || (x == 10 && y >= 3 && y <= 5) || (x == 10 && y >= 7 && y <= 9) ||
                    (y == 1 && x >= 5 && x <= 7) || (y == 11 && x >= 5 && x <= 7) || (x == 1 && y >= 5 && y <= 7) || (x == 11 && y >= 5 && y <= 7) ||
                    (x == 3 && y == 3) || (x == 9 && y == 3) || (x == 3 && y == 9) || (x == 9 && y == 9))
					border = true

				pos[x][y] = ind
				points.push(new Point(ind, x, y, border, outside))
				ind++
			}
		}
		this.pos = pos
		this.points = points

		const edges = [] // those loops are so bad
		for (const x of [4, 5, 8, 9]) {
			for (const y of [2, 10]) {
				const pointA = new Point(pos[x - 1][y], x - 1, y)
				const pointB = new Point(pos[x][y], x, y)
				edges.push(new Edge(pointA, pointB))
				edges.push(new Edge(pointB, pointA))
			}
		}
		for (const x of [6, 7]) {
			for (const y of [1, 11]) {
				const pointA = new Point(pos[x - 1][y], x - 1, y)
				const pointB = new Point(pos[x][y], x, y)
				edges.push(new Edge(pointA, pointB, (y == 1 ? this.colors[1] : this.colors[3])))
				edges.push(new Edge(pointB, pointA, (y == 1 ? this.colors[1] : this.colors[3])))
			}
		}
		for (const y of [4, 5, 8, 9]) {
			for (const x of [2, 10]) {
				const pointA = new Point(pos[x][y - 1], x, y - 1)
				const pointB = new Point(pos[x][y], x, y)
				edges.push(new Edge(pointA, pointB))
				edges.push(new Edge(pointB, pointA))
			}
		}
		for (const y of [6, 7]) {
			for (const x of [1, 11]) {
				const pointA = new Point(pos[x][y - 1], x, y - 1)
				const pointB = new Point(pos[x][y], x, y)
				edges.push(new Edge(pointA, pointB, (x == 1 ? this.colors[0] : this.colors[2])))
				edges.push(new Edge(pointB, pointA, (x == 1 ? this.colors[0] : this.colors[2])))
			}
		}
		for (const y of [2, 11]) {
			for (const x of [5, 7]) {
				const pointA = new Point(pos[x][y - 1], x, y - 1)
				const pointB = new Point(pos[x][y], x, y)
				edges.push(new Edge(pointA, pointB))
				edges.push(new Edge(pointB, pointA))
			}
		}
		for (const y of [3, 10]) {
			for (const x of [3, 9]) {
				const pointA = new Point(pos[x][y - 1], x, y - 1)
				const pointB = new Point(pos[x][y], x, y)
				edges.push(new Edge(pointA, pointB))
				edges.push(new Edge(pointB, pointA))
			}
		}
		for (const x of [2, 11]) {
			for (const y of [5, 7]) {
				const pointA = new Point(pos[x - 1][y], x - 1, y)
				const pointB = new Point(pos[x][y], x, y)
				edges.push(new Edge(pointA, pointB))
				edges.push(new Edge(pointB, pointA))
			}
		}
		for (const x of [3, 10]) {
			for (const y of [3, 9]) {
				const pointA = new Point(pos[x - 1][y], x - 1, y)
				const pointB = new Point(pos[x][y], x, y)
				edges.push(new Edge(pointA, pointB))
				edges.push(new Edge(pointB, pointA))
			}
		}

		this.edges = edges

		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
		for (const point of this.points) {
			if (!point.border)
				continue

			for (const dir of directions) {
				const newX = point.x + dir[0]
				const newY = point.y + dir[1]

				if ((point.x == newX && this.points[this.pos[newX][newY]].border) || (point.y == newY && this.points[this.pos[newX][newY]].border) || this.points[this.pos[newX][newY]].outside)
					this.points[this.pos[point.x][point.y]].edges.push(this.pos[newX][newY])
			}

			this.points[this.pos[4][2]].edges.push(this.pos[5][1])
			this.points[this.pos[8][2]].edges.push(this.pos[7][1])

			this.points[this.pos[4][10]].edges.push(this.pos[5][11])
			this.points[this.pos[8][10]].edges.push(this.pos[7][11])

			this.points[this.pos[2][4]].edges.push(this.pos[1][5])
			this.points[this.pos[2][8]].edges.push(this.pos[1][7])

			this.points[this.pos[10][4]].edges.push(this.pos[11][5])
			this.points[this.pos[10][8]].edges.push(this.pos[11][7])

			this.points[this.pos[3][2]].edges.push(this.pos[2][3])
			this.points[this.pos[2][3]].edges.push(this.pos[3][2])

			this.points[this.pos[2][9]].edges.push(this.pos[3][10])
			this.points[this.pos[3][10]].edges.push(this.pos[2][9])

			this.points[this.pos[9][2]].edges.push(this.pos[10][3])
			this.points[this.pos[10][3]].edges.push(this.pos[9][2])

			this.points[this.pos[9][10]].edges.push(this.pos[10][9])
			this.points[this.pos[10][9]].edges.push(this.pos[9][10])
		}
	}

	gradient() {
		this.ctx.lineWidth = 0

		const settings = JSON.parse(fs.readFileSync('./data/userSettings.json'))
		for (let i = 0; i <= 3; i++) {
			const uid = this.uids[i]
			if (settings[uid] === undefined || settings[uid]['gradient'] === undefined)
				return

			let grd
			if (i == 0)
				grd = this.ctx.createLinearGradient(this.offsetX, this.canvas.height / 2, this.canvas.width / 2, this.canvas.height / 2)
			if (i == 1)
				grd = this.ctx.createLinearGradient(this.canvas.width / 2, this.offsetY, this.canvas.width / 2, this.canvas.height / 2)
			if (i == 2)
				grd = this.ctx.createLinearGradient(this.canvas.width - this.offsetX, this.canvas.height / 2, this.canvas.width / 2, this.canvas.height / 2)
			if (i == 3)
				grd = this.ctx.createLinearGradient(this.canvas.width / 2, this.canvas.height - this.offsetY, this.canvas.width / 2, this.canvas.height / 2)

			if (settings[this.uids[i]]['gradient']['special'] == 'rainbow') {
				grd.addColorStop(0, 'red')
				grd.addColorStop(1 / 6, 'orange')
				grd.addColorStop(2 / 6, 'yellow')
				grd.addColorStop(3 / 6, 'green')
				grd.addColorStop(4 / 6, 'blue')
				grd.addColorStop(5 / 6, 'violet')
				grd.addColorStop(1, 'rgba(127,0,255,0)')
			}
			else if (settings[this.uids[i]]['gradient']['special'] == 'random') {
				let color = Math.floor(Math.random() * 16777215)
				if (color < 0)
					color = 0
				if (color > 16777215)
					color = 16777215

				this.lastColor = color
				grd.addColorStop(0, '#' + color.toString(16).padStart(6, '0'))
				grd.addColorStop(1, 'rgba(' + Math.floor(Math.random() * 255) + ', ' + Math.floor(Math.random() * 255) + ', ' + Math.floor(Math.random() * 255) + ', 0)')
			}
			else {
				grd.addColorStop(0, settings[this.uids[i]]['gradient']['from'])
				grd.addColorStop(1, settings[this.uids[i]]['gradient']['to'])
			}

			this.ctx.fillStyle = grd
			this.ctx.beginPath()
			if (i == 0) {
				this.ctx.moveTo(this.offsetX + this.spacing * 2, this.offsetY + this.spacing * 8)
				this.ctx.lineTo(this.offsetX, this.offsetY + this.spacing * 8)
				this.ctx.lineTo(this.offsetX, this.offsetY + this.spacing * 2)
				this.ctx.lineTo(this.offsetX + this.spacing * 2, this.offsetY + this.spacing * 2)
			}
			if (i == 1) {
				this.ctx.moveTo(this.offsetX + this.spacing * 2, this.offsetY + this.spacing * 2)
				this.ctx.lineTo(this.offsetX + this.spacing * 2, this.offsetY)
				this.ctx.lineTo(this.offsetX + this.spacing * 8, this.offsetY)
				this.ctx.lineTo(this.offsetX + this.spacing * 8, this.offsetY + this.spacing * 2)
			}
			if (i == 2) {
				this.ctx.moveTo(this.offsetX + this.spacing * 8, this.offsetY + this.spacing * 2)
				this.ctx.lineTo(this.offsetX + this.spacing * 10, this.offsetY + this.spacing * 2)
				this.ctx.lineTo(this.offsetX + this.spacing * 10, this.offsetY + this.spacing * 8)
				this.ctx.lineTo(this.offsetX + this.spacing * 8, this.offsetY + this.spacing * 8)
			}
			if (i == 3) {
				this.ctx.moveTo(this.offsetX + this.spacing * 8, this.offsetY + this.spacing * 8)
				this.ctx.lineTo(this.offsetX + this.spacing * 8, this.offsetY + this.spacing * 10)
				this.ctx.lineTo(this.offsetX + this.spacing * 2, this.offsetY + this.spacing * 10)
				this.ctx.lineTo(this.offsetX + this.spacing * 2, this.offsetY + this.spacing * 8)
			}

			this.ctx.lineTo(this.canvas.width / 2, this.canvas.height / 2)
			this.ctx.closePath()
			this.ctx.fill()

			this.ctx.clearRect(this.offsetX, this.offsetY + 2 * this.spacing, this.spacing, 2 * this.spacing)
			this.ctx.clearRect(this.offsetX, this.offsetY + 6 * this.spacing, this.spacing, 2 * this.spacing)

			this.ctx.clearRect(this.offsetX + 2 * this.spacing, this.offsetY, 2 * this.spacing, this.spacing)
			this.ctx.clearRect(this.offsetX + 6 * this.spacing, this.offsetY, 2 * this.spacing, this.spacing)

			this.ctx.clearRect(this.offsetX + 9 * this.spacing, this.offsetY + 2 * this.spacing, this.spacing, 2 * this.spacing)
			this.ctx.clearRect(this.offsetX + 9 * this.spacing, this.offsetY + 6 * this.spacing, this.spacing, 2 * this.spacing)

			this.ctx.clearRect(this.offsetX + 2 * this.spacing, this.offsetY + 9 * this.spacing, 2 * this.spacing, this.spacing)
			this.ctx.clearRect(this.offsetX + 6 * this.spacing, this.offsetY + 9 * this.spacing, 2 * this.spacing, this.spacing)
		}
	}

	draw(paintGradient = true) {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

		if (paintGradient)
			this.gradient()

		this.ctx.textAlign = 'center'
		this.ctx.font = '30px Arial'
		this.ctx.lineWidth = this.thickness


		this.ctx.save()
		this.ctx.translate(this.offsetX - this.offsetX / 2 + 10, this.canvas.height / 2)
		this.ctx.rotate(-Math.PI / 2)
		this.ctx.fillStyle = this.colors[0]
		this.ctx.fillText(this.usernames[0], 0, 0)
		this.ctx.restore()

		this.ctx.save()
		this.ctx.translate(this.canvas.width / 2, this.offsetY - this.offsetY / 2 + 10)
		this.ctx.fillStyle = this.colors[1]
		this.ctx.fillText(this.usernames[1], 0, 0)
		this.ctx.restore()

		this.ctx.save()
		this.ctx.translate(this.canvas.width - this.offsetX / 2 - 10, this.canvas.height / 2)
		this.ctx.rotate(+Math.PI / 2)
		this.ctx.fillStyle = this.colors[2]
		this.ctx.fillText(this.usernames[2], 0, 0)
		this.ctx.restore()

		this.ctx.save()
		this.ctx.translate(this.canvas.width / 2, this.canvas.height - this.offsetY / 2 - 10)
		this.ctx.rotate(Math.PI)
		this.ctx.fillStyle = this.colors[3]
		this.ctx.fillText(this.usernames[3], 0, 0)
		this.ctx.restore()

		this.ctx.fillStyle = '#fff'
		for (const point of this.points) {
			if (point.outside)
				continue

			this.ctx.fillRect(this.offsetX + this.spacing * (point.x - 1) - this.thickness / 2, this.offsetY + this.spacing * (point.y - 1) - this.thickness / 2, this.thickness, this.thickness)
		}

		for (const edge of this.edges) {
			this.ctx.strokeStyle = edge.color
			this.ctx.beginPath()
			this.ctx.moveTo(this.offsetX + this.spacing * (edge.pointA.x - 1), this.offsetY + this.spacing * (edge.pointA.y - 1))
			this.ctx.lineTo(this.offsetX + this.spacing * (edge.pointB.x - 1), this.offsetY + this.spacing * (edge.pointB.y - 1))
			this.ctx.stroke()
		}

		this.ctx.strokeStyle = this.colors[this.turn]
		this.ctx.fillStyle = this.colors[this.turn]

		this.ctx.beginPath()
		this.ctx.arc(this.offsetX + this.spacing * (this.ball.x - 1), this.offsetY + this.spacing * (this.ball.y - 1), 5, 0, 2 * Math.PI, false)
		this.ctx.fill()
		this.ctx.stroke()

		const data = this.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '')
		const buf = Buffer.from(data, 'base64')
		fs.writeFileSync('tmp/boardTeamPilkarzyki' + this.id + '.png', buf)
	}

	possibleMoveIndexes(x, y) {
		if (x == undefined)
			x = this.ball.x
		if (y == undefined)
			y = this.ball.y

		const moves = []
		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]

		for (let i = 0; i < directions.length; i++) {
			const dir = directions[i]
			if (!this.points[this.pos[x][y]].edges.includes(this.pos[x + dir[0]][y + dir[1]]))
				moves.push(i)
		}

		return moves
	}

	possibleMoves(x, y) {
		if (x == undefined)
			x = this.ball.x
		if (y == undefined)
			y = this.ball.y

		const indexes = this.possibleMoveIndexes(x, y)
		const moves = []
		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]

		for (const index of indexes)
			moves.push(this.pos[x + directions[index][0]][y + directions[index][1]])

		return moves
	}

	move(index) {
		const moves = this.possibleMoves()
		if (index >= moves.length || this.win != -1)
			return false

		this.points[this.pos[this.ball.x][this.ball.y]].edges.push(moves[index])
		this.points[moves[index]].edges.push(this.pos[this.ball.x][this.ball.y])
		if (this.turn % 2 == 0)
			this.edges.push(new Edge(this.points[moves[index]], this.points[this.pos[this.ball.x][this.ball.y]], this.colors[this.turn]))
		else
			this.edges.push(new Edge(this.points[moves[index]], this.points[this.pos[this.ball.x][this.ball.y]], this.colors[this.turn]))

		this.totalMoves++

		const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))
		if (ranking['sumaruchow'][this.uids[this.turn]] === undefined)
			ranking['sumaruchow'][this.uids[this.turn]] = 0
		ranking['sumaruchow'][this.uids[this.turn]]++
		fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

		const point = this.points[moves[index]]
		this.ball.x = point.x
		this.ball.y = point.y

		if (this.ball.x == 1 || this.ball.x == 11)
			this.win = 1
		if (this.ball.y == 1 || this.ball.y == 11)
			this.win = 0

		if (this.points[moves[index]].edges.length == 1)
			this.turn = (this.turn + 1) % 4
		if (this.points[moves[index]].edges.length == 8)
			this.win = (this.turn + 1) % 2

		return true
	}

	turnUID() {
		return this.uids[this.turn]
	}

	removeBoard() {
		try {
			fs.unlinkSync('./tmp/boardTeamPilkarzyki' + this.id + '.png')
		}
		catch (error) {
			console.log(error)
		}
	}

	dump(i) {
		fs.writeFileSync('./tmp/boardTeamPilkarzyki' + i + '.dump', inspect(this, { depth: 10 }))
	}
}