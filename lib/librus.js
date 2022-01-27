'use strict'

const config = require('../config.json')
const fetch = require('node-fetch')

let librusCurrentBearer
let client

function splitMessage(message) {
	const res = []
	let lastEndl = -1
	let lastSplit = 0
	let count = 0
	let temp
	for (let i = 0; i < message.length; i++) {
		count++
		if (message[i] == '\n')
			lastEndl = i

		if (count >= 1900) {
			temp = ''
			for (let j = lastSplit; j <= (lastEndl < lastSplit ? lastSplit + 1900 : lastEndl) && j < message.length; j++)
				temp += message[j]

			if (/\S/.test(temp))
				res.push(temp)
			lastSplit = (lastEndl < lastSplit ? lastSplit + 1900 : lastEndl)
			i = lastSplit + 1
			count = 0
		}
	}

	temp = ''
	for (let i = lastSplit; i < message.length; i++)
		temp += message[i]
	if (/\S/.test(temp))
		res.push(temp)

	return res
}

async function updateBearer() {
	let setCookies = []
	let cookies = []
	let sendableCookies = []
	let csrfToken = ''
	const csrfRegex = /<meta name="csrf-token" content="(.*)">/g
	// const someFuckingClientIdConstant = 'AyNzeNoSup7IkySMhBdUhSH4ucqc97Jn6DzVcqd5'
	console.log('\x1b[45mGET https://portal.librus.pl/\x1b[0m')
	const portalResult = await fetch('https://portal.librus.pl/')
	if (!portalResult.ok)
		throw new Error(`unexpected response ${portalResult.statusText}`)

	const portalResultText = await portalResult.text()
	csrfToken = csrfRegex.exec(portalResultText)[1]
	// console.log(csrfToken)
	setCookies = portalResult.headers.raw()['set-cookie']
	for (const cookie of setCookies)
		cookies.push(cookie.split(';')[0])

	// console.log(cookies)
	sendableCookies = cookies.join('; ')

	const body = { email: config.librusLogin, password: config.librusPass }
	console.log('\x1b[45mPOST https://portal.librus.pl/rodzina/login/action\x1b[0m')
	const actionResult = await fetch('https://portal.librus.pl/rodzina/login/action', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: {
			Host: 'portal.librus.pl',
			'Content-Type': 'application/json',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
			Connection: 'keep-alive',
			'X-CSRF-TOKEN': csrfToken,
			Cookie: sendableCookies,
		},
	})
	if (!actionResult.ok)
		throw new Error(`unexpected response ${actionResult.statusText} ${actionResult.status}`)

	setCookies = actionResult.headers.raw()['set-cookie']
	cookies = []
	for (const cookie of setCookies)
		cookies.push(cookie.split(';')[0])

	// console.log(cookies)
	sendableCookies = cookies.join('; ')

	console.log('\x1b[45mGET https://portal.librus.pl/api/v3/SynergiaAccounts\x1b[0m')
	const accountsResult = await fetch('https://portal.librus.pl/api/v3/SynergiaAccounts', {
		method: 'GET',
		headers: {
			Host: 'portal.librus.pl',
			Connection: 'keep-alive',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
			Cookie: sendableCookies,
		},
	})
	const finalText = await accountsResult.text()
	const finalJson = JSON.parse(finalText)
	return finalJson.accounts[0].accessToken
}

async function getSchoolNoticesJson() {
	try {
		// Get the initial JSON of announcements
		console.log('Checking for new announcements via api.librus.pl (GET /PushChanges)')
		const changesResult = await fetch(
			`https://api.librus.pl/2.0/PushChanges?pushDevice=${config.pushDevice}`,
			{
				method: 'GET',
				headers: {
					Host: 'api.librus.pl',
					Connection: 'keep-alive',
					Authorization: 'Bearer ' + librusCurrentBearer,
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
				},
			},
		)
		// Vars used later
		let librusQueryErrorFlag = false
		let changesJson
		// If can't parse, raise error flag (probably malformed/shitty result).
		try {
			changesJson = JSON.parse(await changesResult.text())
		}
		catch (error) {
			librusQueryErrorFlag = true
		}
		// If: Result is not code 200
		// OR
		// the JSON is not the expected one (incorrect)
		// OR
		// JSON parse in general failed,
		// log error, get a new bearer, retry.
		//
		// If any of this massively fails for some reason (like updating bearer),
		// it will just retry getSchoolNoticesJson in 2 mins
		// (see the catch block at the end)
		if (!changesResult.ok || !('Changes' in changesJson) || librusQueryErrorFlag) {
			// Log what's up.
			console.log(`Request error code: ${changesResult.statusText}`)
			console.log('GET Request with Token failed. Bearer token probably expired.')
			if (!librusQueryErrorFlag) {
				console.log('Additionally, here\'s the parsed JSON of the result.')
				console.log(changesJson)
				if (changesJson.Status === 'Maintenance') {
					console.log('Seems like Librus is undergoing maintenance. Throwing error for function.')
					throw new Error('Librus is under maintenance.')
				}
			}
			console.log('Trying to update token.')
			// Try to get a new bearer, retry getSchoolNoticesJson on success.
			try {
				librusCurrentBearer = await updateBearer()
			}
			catch (error) {
				throw new Error(`updateBearer() failed! ${error}`)
			}
			console.log('(Bearer updated, retrying)')
			getSchoolNoticesJson()
			return
		}
		// Iterate over changes since last time we checked
		// Also get the channel to potentially send messages later
		for (const update of changesJson.Changes) {
			// Get the notice if the element is of type 'SchoolNotices'
			if (update.Resource.Type === 'SchoolNotices') {
				console.log(`\x1b[36mGET ${update.Resource.Url}\x1b[0m`)
				const noticeResult = await fetch(update.Resource.Url, {
					headers: {
						Host: 'api.librus.pl',
						Connection: 'keep-alive',
						Authorization: 'Bearer ' + librusCurrentBearer,
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
					},
				})
				const noticeJson = JSON.parse(await noticeResult.text())
				if (noticeJson.Code === 'NoticeNotFound') {
					console.log(`\x1b[31mNoticeNotFound for ${update.Resource.Id}\x1b[0m`)
				}
				else {
					// Base string
					let text = (
						`**__:loudspeaker: Nowe Ogłoszenie w Librusie__**
                        **__${noticeJson.SchoolNotice.Subject}__**
                        ${noticeJson.SchoolNotice.Content}`.replace(/  +/g, '')
					)

					const textWithoutRoles = text
					// Put all relevant classes in Bold
					text = text.replace(/3[a-iA-i ]*[AC]|3[A-Ia-i ]*[AaCc][A-Ia-i ]*3|1[a-iA-i ]*[fF]/g, '**$&**')
					// 3A(3)
					text = text.replace(/^.*(3[a-iA-i ]*[A]|3[A-Ia-i ]*[Aa][A-Ia-i ]*3).*$/gm, '<@&885211379408207962> $&')
					// 3C(3)
					text = text.replace(/^.*(3[a-iA-i ]*[C]|3[A-Ia-i ]*[Cc][A-Ia-i ]*3).*$/gm, '<@&885211432025731092> $&')
					// 1f
					text = text.replace(/^.*(1[a-iA-i ]*[fF]).*$/gm, '<@&932523538601111584> $&')

					let textWithAllClasses = textWithoutRoles
					// Bold
					textWithAllClasses = textWithAllClasses.replace(/3[a-iA-i ]*[ABCDEFG]|3[A-Ia-i ]*[AaBbCcDdEeFfGg][A-Ia-i ]*3|3[a-iA-i ]*[abcdefghi]|3[A-Ia-i ]*[AaBbCcDdEeFfGgHhIi][A-Ia-i ]*4|2[a-iA-i ]*[aABbCcDdEeFfGg]|1[a-iA-i ]*[aABbCcDdEeFfGgHh]/g, '**$&**')
					// roles for 1. class
					for (let letter = 'a'.charCodeAt(); letter <= 'h'.charCodeAt(); letter++) {
						const roleID = '<@&' + client.guilds.cache.get('930512190220435516').roles.cache.find(role => role.name == `1${String.fromCharCode(letter)}`).id + '> $&'
						const regex = new RegExp(`^.*(1[a-iA-i ]*[${String.fromCharCode(letter)}${String.fromCharCode(letter).toUpperCase()}]).*$`, 'gm')
						textWithAllClasses = textWithAllClasses.replace(regex, roleID)
					}
					// roles for 2. class
					for (let letter = 'a'.charCodeAt(); letter <= 'g'.charCodeAt(); letter++) {
						const roleID = '<@&' + client.guilds.cache.get('930512190220435516').roles.cache.find(role => role.name == `2${String.fromCharCode(letter)}`).id + '> $&'
						const regex = new RegExp(`^.*(2[a-iA-i ]*[${String.fromCharCode(letter)}${String.fromCharCode(letter).toUpperCase()}]).*$`, 'gm')
						textWithAllClasses = textWithAllClasses.replace(regex, roleID)
					}
					// roles for 3. class gim
					for (let letter = 'a'.charCodeAt(); letter <= 'g'.charCodeAt(); letter++) {
						const roleID = '<@&' + client.guilds.cache.get('930512190220435516').roles.cache.find(role => role.name == `3${String.fromCharCode(letter).toUpperCase()}3`).id + '> $&'
						const regex = new RegExp(`^.*(3[a-iA-i ]*[${String.fromCharCode(letter).toUpperCase()}]|3[A-Ia-i ]*[${String.fromCharCode(letter)}${String.fromCharCode(letter).toUpperCase()}][A-Ia-i ]*3).*$`, 'gm')
						textWithAllClasses = textWithAllClasses.replace(regex, roleID)
					}
					// roles for 3. class podst
					for (let letter = 'a'.charCodeAt(); letter <= 'i'.charCodeAt(); letter++) {
						const roleID = '<@&' + client.guilds.cache.get('930512190220435516').roles.cache.find(role => role.name == `3${String.fromCharCode(letter)}4`).id + '> $&'
						const regex = new RegExp(`^.*(3[a-iA-i ]*[${String.fromCharCode(letter)}]|3[A-Ia-i ]*[${String.fromCharCode(letter)}${String.fromCharCode(letter).toUpperCase()}][A-Ia-i ]*4).*$`, 'gm')
						textWithAllClasses = textWithAllClasses.replace(regex, roleID)
					}

					// grupy
					let res = ''
					for (let line of text.split('\n')) {
						if (!((line.search('<@&885211432025731092>') != -1 || line.search('<@&885211379408207962>') != -1) && line.toLowerCase().search('gr. p. ') != -1)) {
							res += line + '\n'
							continue
						}

						let replaceWith = ''
						for (const [id, role] of client.guilds.cache.get(config.guild).roles.cache.entries()) {
							if (role.name.substring(0, 2) == '3A' && line.search('<@&885211379408207962>') != -1 && role.name.search('-') != -1) {
								const roleLower = role.name.toLowerCase()

								if (line.toLowerCase().search(roleLower.split('- ')[1]) != -1 || line.toLowerCase().search(roleLower.split('gr. p. ')[1]) != -1) {
									if (replaceWith != '')
										replaceWith += ' '
									replaceWith += '<@&' + id + '>'
								}
							}
							if (role.name.substring(0, 2) == '3C' && line.search('<@&885211432025731092>') != -1 && role.name.search('-') != -1) {
								const roleLower = role.name.toLowerCase()

								if (line.toLowerCase().search(roleLower.split('- ')[1]) != -1 || line.toLowerCase().search(roleLower.split('gr. p. ')[1]) != -1) {
									if (replaceWith != '')
										replaceWith += ' '
									replaceWith += '<@&' + id + '>'
								}
							}
						}

						if (replaceWith != '') {
							if (line.search('<@&885211432025731092>') != -1)
								line = line.replace('<@&885211432025731092>', replaceWith)
							if (line.search('<@&885211379408207962>') != -1)
								line = line.replace('<@&885211379408207962>', replaceWith)
						}
						res += line + '\n'
					}
					text = res

					// Finally, send.
					const settings = require('../data/settings.json')
					for (const info of settings.notices.where) {
						const channel = client.guilds.cache.get(info.guild).channels.cache.get(info.channel)
						if (info.guild == '930512190220435516') {
							for (const split of splitMessage(textWithAllClasses))
								await channel.send(split)
							continue
						}

						for (const split of splitMessage((info.roles ? text : textWithoutRoles)))
							await channel.send(split)
					}

					console.log(`\x1b[1m${noticeJson.SchoolNotice.Id}  --- Sent!\x1b[0m`)
				}
			}
			else {
				console.log(`\x1b[2m${update.Resource.Url} --- Not SchoolNotices. Ignored.\x1b[0m`)
			}
			// DELETE once handled
			console.log(`\x1b[33mDELETE https://api.librus.pl/2.0/PushChanges/${update.Id}?pushDevice=${config.pushDevice}\x1b[0m`)
			const deleteRequest = await fetch(`https://api.librus.pl/2.0/PushChanges/${update.Id}?pushDevice=${config.pushDevice}`, {
				method: 'DELETE',
				headers: {
					Host: 'api.librus.pl',
					Connection: 'keep-alive',
					Authorization: 'Bearer ' + librusCurrentBearer,
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
				},
			})
			if (!deleteRequest.ok)
				throw new Error(`unexpected response ${deleteRequest.statusText}`)

		}
	}
	catch (error) {
		console.log('\x1b[31mSomething in updating notices failed:\x1b[0m')
		console.error(error)
		console.log('\x1b[31mRetrying getSchoolNoticesJson() in 10 mins.\x1b[0m')
		setTimeout(getSchoolNoticesJson, (2 * 60000))
		return
	}
	console.log('\x1b[42m(Done)\x1b[0m')
	setTimeout(getSchoolNoticesJson, ((Math.round(Math.random() * (6 - 4) + 4)) * 60000))
}

module.exports = async function(cl) {
	if (config.librus) {
		client = cl
		librusCurrentBearer = await updateBearer()
		setTimeout(getSchoolNoticesJson, 2000)
	}
}