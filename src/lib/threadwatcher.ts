import { EventEmitter } from "events";
import nodefetch, { Response } from "node-fetch";

const watchedThreads = new Map<string, Map<string, boolean>>();
const threadRequestTries = new Map<string, number>();

const threadRequestMaxTries = 3;
const watchDelay = 120 * 1000;

const newReply = new EventEmitter();

const changePostTimeoutEvent = new EventEmitter();
const desiredPostDelay = 3500;
let postTimeout = 0;

class HTTPResponseError extends Error {
	response: Response;
	constructor(response: Response) {
		super(`HTTP Error Response - ${response.status} ${response.statusText}`);
		this.response = response;
	}
}

changePostTimeoutEvent.on("subtractTimeout", () => {
	postTimeout -= desiredPostDelay;
	// console.log(`timeout reduced to ${timeout}`)
});

async function checkThread(threadKey: string) {
	// Won't run if thread was removed from watchedThreads by unwatchThread()
	if (watchedThreads.has(threadKey)) {
		const knownPosts = watchedThreads.get(threadKey);
		const board = threadKey.split("/")[0];
		const threadID = threadKey.split("/")[1];
		let threadResult;
		// (Try to) Get thread details
		try {
			threadResult = await nodefetch(`https://a.4cdn.org/${board}/thread/${threadID}.json`);
			if (!threadResult.ok)
				throw new HTTPResponseError(threadResult);

		}
		catch (error) {
			// If fails, console.error() the reason.
			if (error.name === "AbortError")
				console.error("AbortError: fetch request was aborted");

			console.error(error);
			// Check if we failed too many times, remove from watchlist if yes.
			// If not, increment threadRequestTries for given thread (threadKey)
			// and try to checkThread again in watchDelay.
			if (threadRequestTries.has(threadKey)) {
				const tries = threadRequestTries.get(threadKey);
				if (tries > threadRequestMaxTries) {
					threadRequestTries.delete(threadKey);
				}
				else {
					threadRequestTries.set(threadKey, tries + 1);
					setTimeout(checkThread.bind(null, threadKey), watchDelay);
				}
			}
			else {
				threadRequestTries.set(threadKey, 1);
				setTimeout(checkThread.bind(null, threadKey), watchDelay);
			}
		}
		// Clear threadRequestTries for thread (threadKey) if request is OK
		threadRequestTries.set(threadKey, 0);
		const threadResultJson = await threadResult.json();
		// Iterate over posts in response JSON, if a post is new to us
		// AND has an image, emit it, do the delay thing.
		for (const post of threadResultJson.posts) {
			if (!knownPosts.has(post.no)) {
				if ("tim" in post) {
					// TODO: Parse com to normal text instead of HTML-ish text provided by 4chan
					setTimeout(function() { newReply.emit("newPost", board, threadID, post.no, post.com, `https://i.4cdn.org/${board}/${post.tim}${post.ext}`); }, postTimeout);
					postTimeout += desiredPostDelay;
					knownPosts.set(post.no, true);
				}
			}
		}
		// Update the postID map for the thread (threadkey)
		watchedThreads.set(threadKey, knownPosts);
		// If thread isn't archived or force-closed, continue rechecking it in watchDelay
		if (!(threadResultJson.posts[0].archived || threadResultJson.posts[0].closed))
			setTimeout(checkThread.bind(null, threadKey), watchDelay);

	}
}

module.exports = {
	newReply,
	changePostTimeoutEvent,
	// Add https://boards.4channel.org/${board}/thread/${threadid} to watched threads
	async watchThread(board: string, threadID: string) {
		const threadKey = `${board}/${threadID}`;
		if (watchedThreads.has(threadKey))
			return { added: false, reason: "Thread is already watched." };

		let threadResult;
		try {
			console.log("Fetching");
			threadResult = await nodefetch(`https://a.4cdn.org/${board}/thread/${threadID}.json`);
			if (!threadResult.ok)
				throw new HTTPResponseError(threadResult);

		}
		catch (error) {
			if (error.name === "AbortError")
				return { added: false, reason: "AbortError: fetch request was aborted" };

			// console.log(error)
			// console.log(error.name)
			return { added: false, reason: `${error}` };
		}
		console.log("Got");
		const threadResultJson = await threadResult.json();
		if (threadResultJson.posts[0].archived || threadResultJson.posts[0].closed)
			return { added: false, reason: "Thread is archived/closed" };

		console.log("Thread isn't archived");
		watchedThreads.set(threadKey, new Map());
		setTimeout(checkThread.bind(null, threadKey), 2000);
		console.log("Done");
		return { added: true };
	},
	// Remove https://boards.4channel.org/${board}/thread/${threadid} from watched threads
	async unwatchThread(board: string, threadID: string) {
		const threadKey = `${board}/${threadID}`;
		const deletedKeys = watchedThreads.delete(threadKey);
		threadRequestTries.delete(threadKey);
		if (deletedKeys)
			return { response: `${board}/${threadID} - Thread unwatched` };

		else
			return { response: "This thread isn't being watched" };

	}
};
