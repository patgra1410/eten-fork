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

export const repeatingDigitsText: Record<number, string> = {
	1: "1️⃣",
	2: "2️⃣",
	3: "3️⃣",
	4: "4️⃣",
	5: "5️⃣",
	6: "6️⃣",
	7: "7️⃣",
	8: "8️⃣",
	9: "9️⃣",
	10: "🔟",
	11: "⚜11⚜",
	12: "⚜12⚜",
	13: "⚜13⚜",
	14: "⚜14⚜",
	15: "⚜15⚜",
	16: "⚜16⚜",
	17: "⚜17⚜",
	18: "⚜18⚜",
	19: "⚜19⚜",
	20: "⚜20⚜"
};

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
	},
	dubs: {
		[user: string]: Record<number, number>
	}
}

export interface IInfo {
	uptimeCron: string
}