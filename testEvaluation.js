'use strict'

const Board=require('./pilkarzykiRenderer.js')
const ExtBoard=require('./bot.js')
var fs = require('fs')

const DRAW_BOARDS=true

/**
 * 
 * EVALUATION FUNCTIONS
 *
 */

// quite bad
let evalLinear = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	// very poor evaluation...
	// TODO: make it not poor
	return (board.ball[0] - 6)
}

// good
let evalQuad = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	// very poor evaluation...
	// TODO: make it not poor
	return (board.ball[0] - 6) * (board.ball[0] - 6)
}

let evalQuadReverse = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	// very poor evaluation...
	// TODO: make it not poor
	return -1 * (board.ball[0] - 6) * (board.ball[0] - 6)
}

let evalQuadSign = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	// very poor evaluation...
	// TODO: make it not poor
	return (board.ball[0] < 6 ? -1 : 1) * (board.ball[0] - 6) * (board.ball[0] - 6)
}

let evalQuadSignReverse = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	// very poor evaluation...
	// TODO: make it not poor
	return -1 * (board.ball[0] < 6 ? -1 : 1) * (board.ball[0] - 6) * (board.ball[0] - 6)
}

let evalCubic = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	// very poor evaluation...
	// TODO: make it not poor
	return (board.ball[0] - 6) * (board.ball[0] - 6) * (board.ball[0] - 6)
}

// good with depth = 4, bad with depth < 4
let evalBFS = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	var points = [board.ball]
	var vis = board.createArray(board.size_ver, board.size_hor, 1, false)

	var queue = []
	queue.push(board.ball)
	vis[board.ball[0]][board.ball[1]] = true

	while(queue.length)
	{
		var v = queue.shift()

		for (var i of board.possibleDirections(v))
		{
			var u = board.moved(v, i)
			
			if (!vis[u[0]][u[1]])
			{
				vis[u[0]][u[1]] = true
				points.push(u)
				queue.push(u)
			}
		}
	}

	// impossible to goal left
	if (points.indexOf([1, 4]) == -1) {
		return 999
	}
	// impossible to goal right
	if (points.indexOf([11, 4]) == -1) {
		return -999
	}

	// very poor evaluation...
	// TODO: make it not poor
	return (board.ball[0] - 6)
}

let evalBFSReverse = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	var points = [board.ball]
	var vis = board.createArray(board.size_ver, board.size_hor, 1, false)

	var queue = []
	queue.push(board.ball)
	vis[board.ball[0]][board.ball[1]] = true

	while(queue.length)
	{
		var v = queue.shift()

		for (var i of board.possibleDirections(v))
		{
			var u = board.moved(v, i)
			
			if (!vis[u[0]][u[1]])
			{
				vis[u[0]][u[1]] = true
				points.push(u)
				queue.push(u)
			}
		}
	}

	// impossible to goal left
	if (points.indexOf([1, 4]) == -1) {
		return 999
	}
	// impossible to goal right
	if (points.indexOf([11, 4]) == -1) {
		return -999
	}

	// very poor evaluation...
	// TODO: make it not poor
	return -1 * (board.ball[0] - 6)
}

// good with depth = 4, bad with depth < 4
let evalBFSCubic = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	var points = [board.ball]
	var vis = board.createArray(board.size_ver, board.size_hor, 1, false)

	var queue = []
	queue.push(board.ball)
	vis[board.ball[0]][board.ball[1]] = true

	while(queue.length)
	{
		var v = queue.shift()

		for (var i of board.possibleDirections(v))
		{
			var u = board.moved(v, i)
			
			if (!vis[u[0]][u[1]])
			{
				vis[u[0]][u[1]] = true
				points.push(u)
				queue.push(u)
			}
		}
	}

	// impossible to goal left
	if (points.indexOf([1, 4]) == -1) {
		return 999
	}
	// impossible to goal right
	if (points.indexOf([11, 4]) == -1) {
		return -999
	}

	// very poor evaluation...
	// TODO: make it not poor
	return (board.ball[0] - 6) * (board.ball[0] - 6) * (board.ball[0] - 6)
}

let evalBFSCubicReverse = function(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	var points = [board.ball]
	var vis = board.createArray(board.size_ver, board.size_hor, 1, false)

	var queue = []
	queue.push(board.ball)
	vis[board.ball[0]][board.ball[1]] = true

	while(queue.length)
	{
		var v = queue.shift()

		for (var i of board.possibleDirections(v))
		{
			var u = board.moved(v, i)
			
			if (!vis[u[0]][u[1]])
			{
				vis[u[0]][u[1]] = true
				points.push(u)
				queue.push(u)
			}
		}
	}

	// impossible to goal left
	if (points.indexOf([1, 4]) == -1) {
		return 999
	}
	// impossible to goal right
	if (points.indexOf([11, 4]) == -1) {
		return -999
	}

	// very poor evaluation...
	// TODO: make it not poor
	return -1 * (board.ball[0] - 6) * (board.ball[0] - 6) * (board.ball[0] - 6)
}


function play(eval1, eval2, depth, cleanFiles) {
	console.log("Playing %s vs %s...", eval1.name, eval2.name)
	var b = new Board(50, 50, 50, [1, 1], [eval1.name, eval2.name], 0)
	var ext_board = [new ExtBoard(b, 9, 13, eval1), new ExtBoard(b, 9, 13, eval2)]

	var avg = [0, 0]
	var n = 0
	var i = 0
	while (b.win == -1) {
		var start=performance.now()
		var move = ext_board[b.turn].search(depth, b.turn, -2000, 2000)[1]
		var end=performance.now()
		n++
		avg[b.turn] = (avg[b.turn]*(n-1) + end-start) / n
		// console.log("Time: ", Math.round((end-start)*100)/100, 'ms', 
		// 			'Avg: ', Math.round(sr*100)/100+'ms')
		// console.log(b.turn, move)

		if (move.length == 0) {
			console.log("Fuck")
		}

		for (var dir of move) {
			var ind = b.possibleMovesIndexes()
			if (!b.move(ind.indexOf(dir))) {
				console.log("AAaaaaaaaaaaaaa")
				break
			}
		}
		ext_board[0].makeMove(move)
		ext_board[1].makeMove(move)
		if (DRAW_BOARDS)
			b.draw(i)
		i = i + 1
	}
	console.log("%s won! There were %d moves", (b.win == 0 ? eval1.name : eval2.name), i)
	console.log("Average time for %s was %f ms, for %s was %f ms\n",
				eval1.name, Math.round(avg[0]*100)/100, eval2.name, Math.round(avg[1]*100)/100)
	
	// clean files
	if (cleanFiles) {
		const path = 'data/'
		let regex = /^boardPilkarzyki\d*[.]png$/
		fs.readdirSync(path)
			.filter(f => regex.test(f))
			.map(f => fs.unlinkSync(path + f))
	}

	return b.win
}

function testEval(evalArr, depth) {
	var n = evalArr.length
	var allGames = n*(n - 1)
	console.log("Tournament with %d games (depth = %d):", allGames, depth)
	
	var won = []
	for (var i = 0; i < n; ++i)
		won.push(0)

	var start = performance.now()
	for (var i = 0; i < n; ++i) {
		for (var j = 0; j < n; ++j) {
			if (i == j)
				continue

			var winner = play(evalArr[i], evalArr[j], depth, true)
			++won[(winner == 0 ? i : j)]
		}
	}
	var end = performance.now()
	
	for (var i = 0; i < n; ++i) {
		console.log("%s won %f\% of games", evalArr[i].name, Math.round(won[i]/allGames*10000)/100)
	}
	console.log("\nTournament took %d seconds", Math.round((end - start)/1000))
}

// testEval([evalLinear, evalQuad, evalQuadSign, evalCubic, evalBFS, evalBFSCubic], 4)
// testEval([evalQuadSign, evalQuad, evalBFS, evalBFSCubic], 4)
testEval([evalQuadReverse, evalBFSReverse, evalBFSCubicReverse, evalQuad, evalBFS, evalBFSCubic], 4)