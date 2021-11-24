module.exports = function evaluationBFSCubicReverse(board) {
	// right goal
	if (board.ball[0] == 11) {
		return 1000
	}
	// left goal
	if (board.ball[0] == 1) {
		return -1000
	}

	var vis = board.createArray(board.size_ver, board.size_hor, 1, false)

	var queue = []
	queue.push(board.ball)
	vis[board.ball[0]][board.ball[1]] = true

	while (queue.length) {
		var v = queue.shift()

		for (var i of board.possibleDirections(v)) {
			var u = board.moved(v, i)
			
			if (!vis[u[0]][u[1]]) {
				vis[u[0]][u[1]] = true
				queue.push(u)
			}
		}
	}

	// impossible to goal left
	if (!vis[1][4]) {
		return 999
	}
	// impossible to goal right
	if (!vis[11][4]) {
		return -999
	}

	// very poor evaluation...
	// TODO: make it not poor
	return -1 * (board.ball[0] - 6) * (board.ball[0] - 6) * (board.ball[0] - 6)
}