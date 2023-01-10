import crypto from "crypto";
import fs from "fs";
import path from "path";

export function sha256(message: string) {
	return crypto.createHash("SHA256").update(message).digest("hex");
}

export function getAllFiles(dir: string): string[] {
	const files = fs.readdirSync(dir);
	const allFiles: string[] = [];
	files.forEach(file => {
		const filePath = path.join(dir, file);
		const stats = fs.statSync(filePath);
		if (stats.isDirectory()) {
			allFiles.push(...getAllFiles(filePath));
		} else {
			allFiles.push(filePath);
		}
	});
	return allFiles;
}