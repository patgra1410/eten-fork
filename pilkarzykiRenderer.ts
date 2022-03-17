import createCanvas from 'canvas' 
import fs from 'fs'

class Point {
	index: number
	x: number
	y: number
	border: Boolean
	outside: Boolean
	edges: Array<Edge>

	constructor(index: number, x: number, y: number, border: Boolean = false, outside: Boolean = false) {
		this.index = index
		this.x = x
		this.y = y
		this.border = border
		this.outside = outside
		this.edges = []
	}
}

class Edge {
	index: number
	pointA: Point
	pointB: Point

	constructor(index: number, pointA: Point, pointB: Point) {
		this.index = index
		this.pointA = pointA
		this.pointB = pointB
	}
}

class Board {

}

module.exports = Board