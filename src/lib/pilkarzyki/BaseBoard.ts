import Point from "./Point";
import Edge from "./Edge";
import { Canvas } from "canvas";
import { Message } from "discord.js";
import { IUserSettings } from "../types";
import fs from "fs";

interface ILongestMove {
	[uid: string]: number
}

export default class BaseBoard {
	id = 0;
	remis: Array<string> = [];
	usernames: Array<string> = [];
	uids: Array<string> = [];
	turn = 0;
	win = -1;
	thickness: number;
	spacing: number;
	offX: number;
	offY: number;
	colors: Array<string>;
	ball: Point;
	canvas: Canvas;
	ctx: CanvasRenderingContext2D;
	points: Array<Point> = [];
	edges: Array<Edge> = [];
	pos: Array<Array<number>>;
	directions = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
	message: Message;
	totalMoves = 0;
	longestMove: ILongestMove = {};
	currMoveLen = 0;

	constructor(spacing: number, offsetX: number, offsetY: number, thickness: number, uids: Array<string>, usernames: Array<string>, id = 0) {
		this.spacing = spacing;
		this.offX = offsetX;
		this.offY = offsetY;
		this.thickness = thickness;
		this.uids = uids;
		this.usernames = usernames;
		this.id = id;
	}

	/**
	 * Get indexes of this.directions which are legal moves from given position.
	 * @param x x coordinate of the position
	 * @param y y coordinate of the position
	 * @returns Array of indexes of this.directions. If index exists in the returned array, it is possible to move there
	 */
	possibleMovesIndexes(x: number = this.ball.x, y: number = this.ball.y): Array<number> {
		const moves = [];

		for (let i = 0; i < this.directions.length; i++) {
			const dir = this.directions[i];
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
		for (const index of indexes)
			moves.push(this.pos[x + this.directions[index][0]][y + this.directions[index][1]]);

		return moves;
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

	get turnUID(): string {
		return this.uids[this.turn];
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
		for (let x = 1; x <= 11; x++) {
			for (let y = 1; y <= 7; y++) {
				for (const i in this.directions) {
					if (graph[x][y][i] === null)
						break;
					if (!graph[x][y][i])
						continue;

					const dir = this.directions[i];
					const nX = x + dir[0];
					const nY = y + dir[1];

					this.points[this.pos[x][y]].edges.push(this.pos[nX][nY]);
					this.edges.push(new Edge(this.points[this.pos[x][y]], this.points[this.pos[nX][nY]], this.spacing, this.offX, this.offY));
				}
			}
		}
	}
}