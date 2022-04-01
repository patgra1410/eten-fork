import { CanvasRenderingContext2D } from "canvas";
import Point from "./Point";

export default class Edge {
	index: number;
	pointA: Point;
	pointB: Point;
	spacing: number;
	offX: number;
	offY: number;
	color = "#fff";

	constructor(pointA: Point, pointB: Point, spacing: number, offsetX: number, offsetY: number, color = "#fff") {
		this.pointA = pointA;
		this.pointB = pointB;
		this.spacing = spacing;
		this.offX = offsetX;
		this.offY = offsetY;
		this.color = color;
	}

	draw(ctx: any) {
		ctx.strokeStyle = this.color;
		ctx.beginPath();
		ctx.moveTo(this.offX + this.spacing * (this.pointA.x - 1), this.offY + this.spacing * (this.pointA.y - 1));
		ctx.lineTo(this.offX + this.spacing * (this.pointB.x - 1), this.offY + this.spacing * (this.pointB.y - 1));
		ctx.stroke();
	}
}