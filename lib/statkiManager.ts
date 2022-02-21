'use strict'

// Discord UID <-> GameID
export default class StatkiManager {
	gryMap: Map<string, number>
	constructor() {
		this.gryMap = new Map()
	}
	newGame(challengerUserId: string, challengedUserId: string): number {
		const gameId = new Date().getTime()
		this.gryMap.set(challengerUserId, gameId)
		this.gryMap.set(challengedUserId, gameId)
		return 123
	}
}