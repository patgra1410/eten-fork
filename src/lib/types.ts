export interface IUserSettings {
	[user: string]: {
		color?: string,
		dlug?: number,
		gradient?: {
			special?: string,
			from?: string,
			to?: string
		}
	}
}

export interface IBets {
	[user: string]: {
		time: number, message: string, timeAdded: number
	}
}

export interface ISettingsWhere {
	guild: string,
	channel: string
	roles?: boolean
}

export interface ISettings {
	jajco: {
		bannedGuilds: string[],
		bannedUsers: string[]
	},
	inspiracja: {
		where: ISettingsWhere[]
	},
	pogoda: {
		where: ISettingsWhere[]
	},
	notices: {
		where: ISettingsWhere[]
	}
}

export interface IRanking {
	pilkarzyki: {
		[user: string]: {
			lost: number,
			won: number,
			rating: number
		}
	},
	kwadraty: {
		[user: string]: {
			lost: number,
			won: number,
			rating: number
		}
	},
	teampilkarzyki: {
		[user: string]: {
			lost: number,
			won: number,
			rating: number
		}
	},
	najdluzszyruch: {
		[user: string]: number
	},
	najdluzszagrapilkarzyki: {
		[game: string]: number
	},
	najdluzszagrateampilkarzyki: {
		[game: string]: number
	},
	sumaruchow: {
		[user: string]: number
	},
	jajco: {
		[user: string]: number
	},
	bets: {
		[user: string]: number
	}
}

export interface IInfo {
	uptimeCron: string
}