import Canvas, { createCanvas } from "canvas";
import fs from "fs";

export default function joinImages(image1path: string, image2path: string, resPath: string) {
	const data1 = fs.readFileSync(image1path), data2 = fs.readFileSync(image2path);
	const img1 = new Canvas.Image, img2 = new Canvas.Image;
	img1.src = data1;
	img2.src = data2;

	const canvas = createCanvas(img1.width + img2.width, Math.max(img1.height, img2.height));
	const ctx = canvas.getContext("2d");
	ctx.drawImage(img1, 0, 0);
	ctx.drawImage(img2, img1.width, 0);

	const data = canvas.toDataURL().replace(/^data:image\/\w+;base64,/, "");
	const buf = Buffer.from(data, "base64");
	fs.writeFileSync(resPath, buf);
}