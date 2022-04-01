import { CanvasRenderingContext2D } from "canvas";

export default class Point {
	index: number;
	x: number;
	y: number;
	spacing: number;
	offX: number;
	offY: number;
	border: boolean;
	outside: boolean;
	edges: Array<number> = [];
	color = "#fff";

	constructor(index: number, x: number, y: number, spacing: number, offsetX: number, offsetY: number, color = "#fff", border = false, outside = false) {
		this.index = index;
		this.x = x;
		this.y = y;
		this.spacing = spacing;
		this.offX = offsetX;
		this.offY = offsetY;
		this.color = color;
		this.border = border;
		this.outside = outside;
	}

	draw(ctx: any, thickness: number) {
		if (this.outside)
			return;

		ctx.fillStyle = this.color;
		ctx.fillRect(this.offX + this.spacing * (this.x - 1) - thickness / 2, this.offY + this.spacing * (this.y - 1) - thickness / 2, thickness, thickness);
	}
}