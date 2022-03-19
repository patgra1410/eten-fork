/* eslint-disable @typescript-eslint/no-var-requires */
const { createCanvas } = require("canvas");
const fs = require("fs");

class Point {
	constructor(index, x, y, border = false, outside = false) {
		this.index = index;
		this.x = x;
		this.y = y;
		this.border = border;
		this.outside = outside;
		this.edges = [];
	}
}

class Edge {
	constructor(index, pointA, pointB) {
		this.index = index;
		this.pointA = pointA;
		this.pointB = pointB;
	}
}

module.exports = class Board {
	constructor(spacing, offsetX, offsetY, uids, usernames, id = 0, withBot = 0) {
		this.remis = [];
		this.usernames = usernames;
		this.uids = uids;
		this.turn = 0;
		this.win = -1;
		this.thickness = 3;
		this.withBot = withBot;

		const settings = JSON.parse(fs.readFileSync("./data/userSettings.json"));
		this.colors = ["#5865f2", "#f04747"];

		for (let i = 0; i < this.uids.length; i++) {
			if (settings[this.uids[i]] !== undefined && settings[this.uids[i]]["color"] !== undefined)
				this.colors[i] = settings[this.uids[i]]["color"];
		}

		this.id = id;
		this.spacing = spacing;
		this.offsetX = offsetX;
		this.offsetY = offsetY;
		this.totalMoves = 0;
		this.longestMove = {};
		this.currentMoveLength = 0;

		for (const uid of this.uids)
			this.longestMove[uid] = 0;

		this.ball = new Point(-1, 6, 4);

		this.canvas = createCanvas(offsetX * 2 + 10 * spacing, offsetY * 2 + spacing * 6);
		this.ctx = this.canvas.getContext("2d");

		const points = [];
		const pos = Array(13);
		for (let i = 0; i < pos.length; i++)
			pos[i] = new Array(9);

		let ind = 0;
		for (let y = 0; y <= 8; y++) {
			for (let x = 0; x <= 12; x++) {
				let outside = false;
				if ((x == 1 || x == 11) && (y == 1 || y == 2 || y == 6 || y == 7))
					outside = true;
				if (y == 0 || y == 8 || x == 0 || x == 12)
					outside = true;
				let border = false;
				if ((y == 1 || y == 7) && x >= 2 && x <= 10)
					border = true;
				if ((x == 1 || x == 11) && y >= 3 && y <= 5)
					border = true;
				if ((x == 2 || x == 10) && ((y >= 1 && y <= 3) || (y >= 5 && y <= 7)))
					border = true;

				pos[x][y] = ind;
				points.push(new Point(ind, x, y, border, outside));
				ind++;
			}
		}
		this.pos = pos;
		this.points = points;

		ind = 0;
		const edges = [];
		for (let x = 3; x <= 10; x++) {
			edges.push(new Edge(ind, new Point(pos[x][1], x, 1, true), new Point(pos[x - 1][1], x - 1, 1, true)));
			ind++;
			edges.push(new Edge(ind, new Point(pos[x][7], x, 7, true), new Point(pos[x - 1][7], x - 1, 7, true)));
			ind++;
		}
		for (let y = 2; y <= 7; y++) {
			edges.push(new Edge((y >= 4 && y <= 5 ? -3 : ind), new Point((y >= 4 && y <= 5 ? pos[1][y] : pos[2][y]), (y >= 4 && y <= 5 ? 1 : 2), y, true), new Point((y >= 4 && y <= 5 ? pos[1][y - 1] : pos[2][y - 1]), (y >= 4 && y <= 5 ? 1 : 2), y - 1, true)));
			ind++;
			edges.push(new Edge((y >= 4 && y <= 5 ? -2 : ind), new Point((y >= 4 && y <= 5 ? pos[11][y] : pos[10][y]), (y >= 4 && y <= 5 ? 11 : 10), y, true), new Point((y >= 4 && y <= 5 ? pos[11][y - 1] : pos[10][y - 1]), (y >= 4 && y <= 5 ? 11 : 10), y - 1, true)));
			ind++;
		}
		edges.push(new Edge(ind, new Point(pos[1][3], 1, 3, true), new Point(pos[2][3], 2, 3, true)));
		ind++;
		edges.push(new Edge(ind, new Point(pos[1][5], 1, 5, true), new Point(pos[2][5], 2, 5, true)));
		ind++;
		edges.push(new Edge(ind, new Point(pos[10][3], 10, 3, true), new Point(pos[11][3], 11, 3, true)));
		ind++;
		edges.push(new Edge(ind, new Point(pos[10][5], 10, 5, true), new Point(pos[11][5], 11, 5, true)));

		this.edges = edges;

		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
		for (const i in this.points) { // for every point
			const point = this.points[i];

			if (!point.border)
				continue;

			for (const j in directions) { // in every move direction
				const dir = directions[j];
				const newX = point.x + dir[0];
				const newY = point.y + dir[1];

				if ((newX == point.x && this.points[pos[newX][newY]].border) || (newY == point.y && this.points[pos[newX][newY]].border) || this.points[pos[newX][newY]].outside)
					this.points[i].edges.push(pos[newX][newY]);
			}
		}
		this.points[pos[2][2]].edges.push(pos[1][3]);
		this.points[pos[2][6]].edges.push(pos[1][5]);
		this.points[pos[10][2]].edges.push(pos[11][3]);
		this.points[pos[10][6]].edges.push(pos[11][5]);
	}

	draw(fileInd = null) {
		if (fileInd === null)
			fileInd = this.id;

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		const settings = JSON.parse(fs.readFileSync("./data/userSettings.json"));
		if (settings[this.uids[0]] !== undefined && settings[this.uids[0]]["gradient"] !== undefined) {
			const grd = this.ctx.createLinearGradient(this.offsetX, this.canvas.height / 2, this.offsetX + 5 * this.spacing, this.canvas.height / 2);
			if (settings[this.uids[0]]["gradient"]["special"] == "rainbow") {
				grd.addColorStop(0, "red");
				grd.addColorStop(1 / 6, "orange");
				grd.addColorStop(2 / 6, "yellow");
				grd.addColorStop(3 / 6, "green");
				grd.addColorStop(4 / 6, "blue");
				grd.addColorStop(5 / 6, "violet");
				grd.addColorStop(1, "rgba(127,0,255,0)");
			}
			else if (settings[this.uids[0]]["gradient"]["special"] == "random") {
				let color = Math.floor(Math.random() * 16777215);
				if (color < 0)
					color = 0;
				if (color > 16777215)
					color = 16777215;

				this.lastColor = color;
				grd.addColorStop(0, "#" + color.toString(16).padStart(6, "0"));
				grd.addColorStop(1, "rgba(" + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", 0)");
			}
			else {
				grd.addColorStop(0, settings[this.uids[0]]["gradient"]["from"]);
				grd.addColorStop(1, settings[this.uids[0]]["gradient"]["to"]);
			}
			this.ctx.fillStyle = grd;
			this.ctx.fillRect(0, 0, this.offsetX + 5 * this.spacing, this.canvas.height);
		}
		if (settings[this.uids[1]] !== undefined && settings[this.uids[1]]["gradient"] !== undefined) {
			const grd = this.ctx.createLinearGradient(this.canvas.width - this.offsetX, this.canvas.height / 2, this.canvas.width / 2, this.canvas.height / 2);
			if (settings[this.uids[1]]["gradient"]["special"] == "rainbow") {
				grd.addColorStop(0, "red");
				grd.addColorStop(1 / 6, "orange");
				grd.addColorStop(2 / 6, "yellow");
				grd.addColorStop(3 / 6, "green");
				grd.addColorStop(4 / 6, "blue");
				grd.addColorStop(5 / 6, "violet");
				grd.addColorStop(1, "rgba(127,0,255,0)");
			}
			else if (settings[this.uids[1]]["gradient"]["special"] == "random") {
				let color = Math.floor(Math.random() * 16777215);
				if (color < 0)
					color = 0;
				if (color > 16777215)
					color = 16777215;

				this.lastColor = color;
				grd.addColorStop(0, "#" + color.toString(16).padStart(6, "0"));
				grd.addColorStop(1, "rgba(" + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", 0)");
			}
			else {
				grd.addColorStop(0, settings[this.uids[1]]["gradient"]["from"]);
				grd.addColorStop(1, settings[this.uids[1]]["gradient"]["to"]);
			}
			this.ctx.fillStyle = grd;
			this.ctx.fillRect(this.offsetX + 5 * this.spacing, 0, this.canvas.width, this.canvas.height);
		}
		this.ctx.clearRect(0, 0, this.canvas.width, this.offsetY);
		this.ctx.clearRect(0, this.offsetY + this.spacing * 6, this.canvas.width, this.canvas.height);
		this.ctx.clearRect(0, 0, this.offsetX, this.canvas.height);
		this.ctx.clearRect(0, 0, this.offsetX + this.spacing, this.offsetY + 2 * this.spacing);
		this.ctx.clearRect(0, this.offsetY + 4 * this.spacing, this.offsetX + this.spacing, this.canvas.height);
		this.ctx.clearRect(this.canvas.width - this.offsetX, 0, this.canvas.width, this.canvas.height);
		this.ctx.clearRect(this.canvas.width - 2 * this.offsetX, 0, this.canvas.width, this.offsetY + 2 * this.spacing);
		this.ctx.clearRect(this.canvas.width - 2 * this.offsetX, this.canvas.height - this.offsetY - 2 * this.spacing, this.canvas.width, this.canvas.height);

		this.ctx.textAlign = "center";
		this.ctx.font = "30px Arial";
		this.ctx.lineWidth = this.thickness;

		this.ctx.save();
		this.ctx.translate(this.offsetX - this.offsetX / 2 + 10, this.canvas.height / 2);
		this.ctx.rotate(-Math.PI / 2);
		this.ctx.fillStyle = this.colors[0];
		this.ctx.fillText(this.usernames[0], 0, 0);
		this.ctx.restore();

		this.ctx.save();
		this.ctx.translate(this.canvas.width - this.offsetX / 2 - 10, this.canvas.height / 2);
		this.ctx.rotate(+Math.PI / 2);
		this.ctx.fillStyle = this.colors[1];
		this.ctx.fillText(this.usernames[1], 0, 0);
		this.ctx.restore();

		this.ctx.fillStyle = "#fff";
		for (const i in this.points) {
			const point = this.points[i];
			if (point.outside)
				continue;
			this.ctx.fillRect(this.offsetX + this.spacing * (point.x - 1) - this.thickness / 2, this.offsetY + this.spacing * (point.y - 1) - this.thickness / 2, this.thickness, this.thickness);
		}

		this.ctx.strokeStyle = "#fff";
		for (const i in this.edges) {
			const edge = this.edges[i];

			if (edge.index == -3)
				this.ctx.strokeStyle = this.colors[0];
			else if (edge.index == -2)
				this.ctx.strokeStyle = this.colors[1];
			else
				this.ctx.strokeStyle = "#fff";

			this.ctx.beginPath();
			this.ctx.moveTo(this.offsetX + this.spacing * (edge.pointA.x - 1), this.offsetY + this.spacing * (edge.pointA.y - 1));
			this.ctx.lineTo(this.offsetX + this.spacing * (edge.pointB.x - 1), this.offsetY + this.spacing * (edge.pointB.y - 1));
			this.ctx.stroke();
		}

		this.ctx.strokeStyle = this.colors[this.turn];
		this.ctx.fillStyle = this.colors[this.turn];

		this.ctx.beginPath();
		this.ctx.arc(this.offsetX + this.spacing * (this.ball.x - 1), this.offsetY + this.spacing * (this.ball.y - 1), 5, 0, 2 * Math.PI, false);
		this.ctx.fill();
		this.ctx.stroke();

		const data = this.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, "");
		const buf = Buffer.from(data, "base64");
		fs.writeFileSync("tmp/boardPilkarzyki" + fileInd + ".png", buf);
	}

	possibleMovesIndexes(x, y) {
		if (x === undefined && y === undefined) {
			x = this.ball.x;
			y = this.ball.y;
		}

		const moves = [];
		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

		for (let i = 0; i < directions.length; i++) {
			const dir = directions[i];
			if (!this.points[this.pos[x][y]].edges.includes(this.pos[x + dir[0]][y + dir[1]]))
				moves.push(i);
		}

		return moves;
	}

	possibleMoves(x, y) {
		if (x === undefined && y === undefined) {
			x = this.ball.x;
			y = this.ball.y;
		}

		const indexes = this.possibleMovesIndexes(x, y);
		const moves = [];
		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

		for (let i = 0; i < indexes.length; i++) {
			const index = indexes[i];
			moves.push(this.pos[x + directions[index][0]][y + directions[index][1]]);
		}

		return moves;
	}

	save(file) {
		const data =
            JSON.stringify(this.points) + "\n#\n" +
            JSON.stringify(this.pos) + "\n#\n" +
            JSON.stringify(this.edges) + "\n#\n" +
            JSON.stringify(this.ball) + "\n#\n" +
            JSON.stringify(this.turn) + "\n#\n";

		fs.writeFileSync(file, data);
	}

	load(file) {
		const data = fs.readFileSync(file, { encoding: "utf8" }).split("#");

		this.points = JSON.parse(data[0]);
		this.pos = JSON.parse(data[1]);
		this.edges = JSON.parse(data[2]);
		this.ball = JSON.parse(data[3]);
		this.turn = JSON.parse(data[4]);
	}

	loadFromGraph(graph) {
		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

		for (let x = 1; x <= 11; x++) {
			for (let y = 1; y <= 7; y++) {
				for (const i in directions) {
					if (graph[x][y][i] === null)
						break;
					if (!graph[x][y][i])
						continue;

					const dir = directions[i];
					const nX = x + dir[0];
					const nY = y + dir[1];

					this.points[this.pos[x][y]].edges.push(this.pos[nX][nY]);
					this.edges.push(new Edge(-3, this.points[this.pos[x][y]], this.points[this.pos[nX][nY]]));
				}
			}
		}
	}

	move(index) {
		const moves = this.possibleMoves();

		if (index >= moves.length || this.win != -1)
			return false;

		this.points[this.pos[this.ball.x][this.ball.y]].edges.push(moves[index]);
		this.points[moves[index]].edges.push(this.pos[this.ball.x][this.ball.y]);
		this.edges.push(new Edge(-3 + this.turn, this.points[moves[index]], this.points[this.pos[this.ball.x][this.ball.y]]));

		this.totalMoves++;
		if (!this.withBot) {
			const ranking = JSON.parse(fs.readFileSync("./data/ranking.json"));
			if (ranking["sumaruchow"][this.uids[this.turn]] === undefined)
				ranking["sumaruchow"][this.uids[this.turn]] = 0;
			ranking["sumaruchow"][this.uids[this.turn]]++;
			fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));
		}

		const point = this.points[moves[index]];
		this.ball.x = point.x;
		this.ball.y = point.y;

		if (this.ball.x == 1)
			this.win = 1;
		if (this.ball.x == 11)
			this.win = 0;

		if (this.points[moves[index]].edges.length == 1)
			this.turn = (this.turn + 1) % 2;

		if (this.points[moves[index]].edges.length == 8)
			this.win = (this.turn + 1) % 2;

		return true;
	}

	removeBoard() {
		try {
			fs.unlinkSync("./tmp/boardPilkarzyki" + this.id + ".png");
		}
		catch (error) {
			console.log(error);
		}
	}

	turnUID() {
		return this.uids[this.turn];
	}
};
