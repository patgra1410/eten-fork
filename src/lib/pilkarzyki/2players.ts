import { Canvas, createCanvas } from "canvas";
import fs from "fs";
import Point from "./Point";
import Edge from "./Edge";
import { IRanking, IUserSettings } from "../types";
import { Message } from "discord.js";

interface ILongestMove {
	[uid: string]: number
}

export default class Board {
	id = 0;
	remis: Array<string>;
	usernames: Array<string> = [];
	uids: Array<string> = [];
	turn = 0;
	win = -1;
	thickness: number;
	withBot: boolean;
	spacing: number;
	offX: number;
	offY: number;
	colors: Array<string>;
	totalMoves = 0;
	longestMove: ILongestMove = {};
	currMoveLen = 0;
	ball: Point;
	canvas: Canvas;
	ctx: CanvasRenderingContext2D;
	points: Array<Point> = [];
	edges: Array<Edge> = [];
	pos: Array<Array<number>>;
	directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
	message: Message;

	constructor(spacing: number, offsetX: number, offsetY: number, uids: Array<string>, usernames: Array<string>, id = 0, withBot = false) {
		this.spacing = spacing;
		this.offX = offsetX;
		this.offY = offsetY;
		this.uids = uids;
		this.usernames = usernames;
		this.id = id;
		this.withBot = withBot;

		const settings: IUserSettings = JSON.parse(fs.readFileSync("./data/userSettings.json", "utf8"));

		this.colors = ["#5865f2", "#f04747"];
		for (let i = 0; i < this.uids.length; i++) {
			if (settings[this.uids[i]] !== undefined && settings[this.uids[i]]["color"] !== undefined)
				this.colors[i] = settings[this.uids[i]]["color"];
		}

		for (const uid of this.uids)
			this.longestMove[uid] = 0;

		this.ball = new Point(-1, 6, 4, this.spacing, this.offX, this.offY);
		this.canvas = createCanvas(this.offX * 2 + 10 * spacing, this.offY * 2 + spacing * 6);
		this.ctx = this.canvas.getContext("2d");

		this.pos = Array(13);
		for (let i = 0; i < this.pos.length; i++)
			this.pos[i] = new Array(9);

		let ind = 0;
		for (let y = 0; y <= 8; y++) {
			for (let x = 0; x <= 12; x++) {
				const outside = this.isPointOutside(x, y);
				const border = this.isPointOnBorder(x, y);

				this.pos[x][y] = ind;
				this.points.push(new Point(ind, x, y, this.spacing, this.offX, this.offY, "#fff", border, outside));
				ind++;
			}
		}

		// upper and lower edge
		for (let x = 3; x <= 10; x++) {
			this.edges.push(new Edge(
				new Point(this.pos[x][1], x, 1, this.spacing, this.offX, this.offY, "#fff", true),
				new Point(this.pos[x - 1][1], x - 1, 1, this.spacing, this.offX, this.offY, "#fff", true),
				this.spacing, this.offX, this.offY
			));

			this.edges.push(new Edge(
				new Point(this.pos[x][7], x, 7, this.spacing, this.offX, this.offY, "#fff", true),
				new Point(this.pos[x - 1][7], x - 1, 7, this.spacing, this.offX, this.offY, "#fff", true),
				this.spacing, this.offX, this.offY
			));
		}

		// left and right edges
		for (let y = 2; y <= 7; y++) {
			const color1 = (y >= 4 && y <= 5 ? this.colors[0] : "#fff");
			const color2 = (y >= 4 && y <= 5 ? this.colors[1] : "#fff");

			this.edges.push(new Edge(
				new Point((y >= 4 && y <= 5 ? this.pos[1][y] : this.pos[2][y]), (y >= 4 && y <= 5 ? 1 : 2), y, this.spacing, this.offX, this.offY, "#fff", true),
				new Point((y >= 4 && y <= 5 ? this.pos[1][y - 1] : this.pos[2][y - 1]), (y >= 4 && y <= 5 ? 1 : 2), y - 1, this.spacing, this.offX, this.offY, "#fff", true),
				this.spacing, this.offX, this.offY, color1
			));

			this.edges.push(new Edge(
				new Point((y >= 4 && y <= 5 ? this.pos[11][y] : this.pos[10][y]), (y >= 4 && y <= 5 ? 11 : 10), y, this.spacing, this.offX, this.offY, "#fff", true),
				new Point((y >= 4 && y <= 5 ? this.pos[11][y - 1] : this.pos[10][y - 1]), (y >= 4 && y <= 5 ? 11 : 10), y - 1, this.spacing, this.offX, this.offY, "#fff", true),
				this.spacing, this.offX, this.offY, color2
			));
		}

		this.edges.push(new Edge(
			new Point(this.pos[1][3], 1, 3, this.spacing, this.offX, this.offY, "#fff", true),
			new Point(this.pos[2][3], 2, 3, this.spacing, this.offX, this.offY, "#fff", true),
			this.spacing, this.offX, this.offY
		));

		this.edges.push(new Edge(
			new Point(this.pos[1][5], 1, 5, this.spacing, this.offX, this.offY, "#fff", true),
			new Point(this.pos[2][5], 2, 5, this.spacing, this.offX, this.offY, "#fff", true),
			this.spacing, this.offX, this.offY
		));

		this.edges.push(new Edge(
			new Point(this.pos[10][3], 10, 3, this.spacing, this.offX, this.offY, "#fff", true),
			new Point(this.pos[11][3], 11, 3, this.spacing, this.offX, this.offY, "#fff", true),
			this.spacing, this.offX, this.offY
		));

		this.edges.push(new Edge(
			new Point(this.pos[10][5], 10, 5, this.spacing, this.offX, this.offY, "#fff", true),
			new Point(this.pos[11][5], 11, 5, this.spacing, this.offX, this.offY, "#fff", true),
			this.spacing, this.offX, this.offY
		));

		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
		for (const point of this.points) {
			if (!point.border)
				continue;

			for (const dir of directions) {
				const newX = point.x + dir[0];
				const newY = point.y + dir[1];

				if ((newX == point.x && this.points[this.pos[newX][newY]].border) || (newY == point.y && this.points[this.pos[newX][newY]].border) || this.points[this.pos[newX][newY]].outside)
					point.edges.push(this.pos[newX][newY]);
			}
		}
		this.points[this.pos[2][6]].edges.push(this.pos[1][5]);
		this.points[this.pos[2][2]].edges.push(this.pos[1][3]);
		this.points[this.pos[10][2]].edges.push(this.pos[11][3]);
		this.points[this.pos[10][6]].edges.push(this.pos[11][5]);
	}

	/**
	 * Draw current board
	 * @param id file will be saved to `tmp/boardPilkarzyki${id}.png`
	 */
	draw(id: string = this.id.toString()) {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		let grd = this.getGradient(this.offX, this.canvas.height / 2, this.canvas.width / 2, this.canvas.height / 2, this.uids[0]);
		if (grd != undefined) {
			this.ctx.fillStyle = grd;
			this.ctx.fillRect(0, 0, this.offX + 5 * this.spacing, this.canvas.height);
		}

		grd = this.getGradient(this.canvas.width - this.offX, this.canvas.height / 2, this.canvas.width / 2, this.canvas.height / 2, this.uids[1]);
		if (grd != undefined) {
			this.ctx.fillStyle = grd;
			this.ctx.fillRect(this.offX + 5 * this.spacing, 0, this.canvas.width, this.canvas.height);
		}

		// clear gradient outside of play area
		this.ctx.clearRect(0, 0, this.canvas.width, this.offY);
		this.ctx.clearRect(0, this.offY + this.spacing * 6, this.canvas.width, this.canvas.height);
		this.ctx.clearRect(0, 0, this.offX, this.canvas.height);
		this.ctx.clearRect(0, 0, this.offX + this.spacing, this.offY + 2 * this.spacing);
		this.ctx.clearRect(0, this.offY + 4 * this.spacing, this.offX + this.spacing, this.canvas.height);
		this.ctx.clearRect(this.canvas.width - this.offX, 0, this.canvas.width, this.canvas.height);
		this.ctx.clearRect(this.canvas.width - 2 * this.offX, 0, this.canvas.width, this.offY + 2 * this.spacing);
		this.ctx.clearRect(this.canvas.width - 2 * this.offX, this.canvas.height - this.offY - 2 * this.spacing, this.canvas.width, this.canvas.height);

		this.ctx.textAlign = "center";
		this.ctx.font = "30px Arial";
		this.ctx.lineWidth = this.thickness;

		// Write 1st username
		this.ctx.save();
		this.ctx.translate(this.offX - this.offX / 2 + 10, this.canvas.height / 2);
		this.ctx.rotate(-Math.PI / 2);
		this.ctx.fillStyle = this.colors[0];
		this.ctx.fillText(this.usernames[0], 0, 0);
		this.ctx.restore();

		// Write 2nd username
		this.ctx.save();
		this.ctx.translate(this.canvas.width - this.offX / 2 - 10, this.canvas.height / 2);
		this.ctx.rotate(+Math.PI / 2);
		this.ctx.fillStyle = this.colors[1];
		this.ctx.fillText(this.usernames[1], 0, 0);
		this.ctx.restore();

		for (const point of this.points)
			point.draw(this.ctx, this.thickness);

		for (const edge of this.edges)
			edge.draw(this.ctx);

		this.ctx.strokeStyle = this.colors[this.turn];
		this.ctx.fillStyle = this.colors[this.turn];

		// draw te ball
		this.ctx.beginPath();
		this.ctx.arc(this.offX + this.spacing * (this.ball.x - 1), this.offY + this.spacing * (this.ball.y - 1), 5, 0, 2 * Math.PI, false);
		this.ctx.fill();
		this.ctx.stroke();

		const data = this.canvas.toDataURL().replace(/^data:image\/\w+;base64,/, "");
		const buf = Buffer.from(data, "base64");
		fs.writeFileSync(`tmp/boardPilkarzyki${id}.png`, buf);
	}

	/**
	 * Get indexes of this.directions which are legal moves from given position.
	 * @param x x coordinate of the position
	 * @param y y coordinate of the position
	 * @returns Array of indexes of this.directions. If index exists in the returned array, it is possible to move there
	 */
	possibleMovesIndexes(x: number = this.ball.x, y: number = this.ball.y): Array<number> {
		const moves = [];
		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

		for (let i = 0; i < directions.length; i++) {
			const dir = directions[i];
			if (!this.points[this.pos[x][y]].edges.includes(this.pos[x + dir[0]][y + dir[1]]))
				moves.push(i);
		}

		return moves;
	}

	/**
	 * Get ids of Point which are legal to move on from given position
	 * @param x x coordinate of the position
	 * @param y y coordinate of the position
	 * @returns Array of ids of Points, which are a legal move
	 */
	possibleMoves(x: number = this.ball.x, y: number = this.ball.y): Array<number> {
		const indexes = this.possibleMovesIndexes(x, y);
		const moves = [];
		const directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

		for (const index of indexes)
			moves.push(this.pos[x + directions[index][0]][y + directions[index][1]]);

		return moves;
	}

	/**
	 * Try moving in a given direction
	 * @param index in which direction from this.possibleMoveIndexes to move
	 * @returns true if move was successful, false otherwise
	 */
	move(index: number): boolean {
		const moves = this.possibleMoves();

		if (index >= moves.length || this.win != -1)
			return false;

		this.points[this.pos[this.ball.x][this.ball.y]].edges.push(moves[index]);
		this.points[moves[index]].edges.push(this.pos[this.ball.x][this.ball.y]);
		this.edges.push(new Edge(this.points[moves[index]], this.points[this.pos[this.ball.x][this.ball.y]], this.spacing, this.offX, this.offY, this.colors[this.turn]));
		this.totalMoves++;

		if (!this.withBot) {
			const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf8"));
			if (ranking.sumaruchow[this.uids[this.turn]] === undefined)
				ranking.sumaruchow[this.uids[this.turn]] = 0;
			ranking.sumaruchow[this.uids[this.turn]]++;
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

	get turnUID(): string {
		return this.uids[this.turn];
	}

	getGradient(begX: number, begY: number, endX: number, endY: number, uid: string) {
		const settings: IUserSettings = JSON.parse(fs.readFileSync("./data/userSettings.json", "utf8"));

		if (settings[uid] === undefined || settings[uid].gradient === undefined)
			return;

		const grd = this.ctx.createLinearGradient(begX, begY, endX, endY);
		if (settings[uid].gradient.special == "rainbow") {
			grd.addColorStop(0, "red");
			grd.addColorStop(1 / 6, "orange");
			grd.addColorStop(2 / 6, "yellow");
			grd.addColorStop(3 / 6, "green");
			grd.addColorStop(4 / 6, "blue");
			grd.addColorStop(5 / 6, "violet");
			grd.addColorStop(1, "rgba(127,0,255,0)");
		}
		else if (settings[uid].gradient.special == "random") {
			let color = Math.floor(Math.random() * 16777215);
			if (color < 0)
				color = 0;
			if (color > 16777215)
				color = 16777215;

			grd.addColorStop(0, "#" + color.toString(16).padStart(6, "0"));
			grd.addColorStop(1, "rgba(" + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", 0)");
		}
		else {
			grd.addColorStop(0, settings[this.uids[0]]["gradient"]["from"]);
			grd.addColorStop(1, settings[this.uids[0]]["gradient"]["to"]);
		}

		return grd;
	}

	isPointOutside(x: number, y: number): boolean {
		if ((x == 1 || x == 11) && (y == 1 || y == 2 || y == 6 || y == 7))
			return true;
		if (y == 0 || y == 8 || x == 0 || x == 12)
			return true;
		return false;
	}

	isPointOnBorder(x: number, y: number): boolean {
		if ((y == 1 || y == 7) && x >= 2 && x <= 10)
			return true;
		if ((x == 1 || x == 11) && y >= 3 && y <= 5)
			return true;
		if ((x == 2 || x == 10) && ((y >= 1 && y <= 3) || (y >= 5 && y <= 7)))
			return true;
		return false;
	}

	save(file: string) {
		const data =
            JSON.stringify(this.points) + "\n#\n" +
            JSON.stringify(this.pos) + "\n#\n" +
            JSON.stringify(this.edges) + "\n#\n" +
            JSON.stringify(this.ball) + "\n#\n" +
            JSON.stringify(this.turn) + "\n#\n";

		fs.writeFileSync(file, data);
	}

	load(file: string) {
		const data = fs.readFileSync(file, { encoding: "utf8" }).split("#");

		this.points = JSON.parse(data[0]);
		this.pos = JSON.parse(data[1]);
		this.edges = JSON.parse(data[2]);
		this.ball = JSON.parse(data[3]);
		this.turn = JSON.parse(data[4]);
	}

	loadFromGraph(graph: Array<Array<Array<boolean>>>) {
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
					this.edges.push(new Edge(this.points[this.pos[x][y]], this.points[this.pos[nX][nY]], this.spacing, this.offX, this.offY));
				}
			}
		}
	}
}