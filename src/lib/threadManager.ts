import nodeFetch, { Response } from "node-fetch";
import { client } from "../index";

interface IThreadData {
	errorStrikes: number;
	threadId: string;
	boardId: string;
	knownPosts: Map<string, boolean>;
}

interface IPostData {
	postId: string;
	threadId: string;
	boardId: string;
	imgUrl: string;
}

export const watchedThreads = new Map<string, IThreadData>();

const POST_TIMEOUT = 3500;
const MAX_TIMEOUT_STRIKES = 3;
const postQueue: IPostData[] = [];

class HTTPError extends Error {
	response: Response;
	constructor(response: Response) {
		super(`HTTP Error Response - ${response.status} ${response.statusText}`);
		this.response = response;
	}
}

async function queueCheck() {
	if (!postQueue.length) {
		setTimeout(queueCheck, POST_TIMEOUT);
		return;
	}
	const postData = postQueue.pop();
	await client.imageCdnChannel.send({
		content: `<https://boards.4channel.org/${postData.boardId}/thread/${postData.threadId}#p${postData.postId}>`,
		files: [postData.imgUrl]
	});
}

export async function checkThreads() {
	for (const threadKey of watchedThreads.keys()) {
		const threadData = watchedThreads.get(threadKey);
		let threadResultJson;
		try {
			const threadResult = await nodeFetch(`https://a.4cdn.org/${threadData.boardId}/thread/${threadData.threadId}.json`);
			threadResultJson = await threadResult.json();
			if (!threadResult.ok)
				throw new HTTPError(threadResult);
		}
		catch (error) {
			console.error(error);
			if (threadData.errorStrikes > MAX_TIMEOUT_STRIKES) {
				watchedThreads.delete(threadKey);
			}
			else {
				threadData.errorStrikes++;
				watchedThreads.set(threadKey, threadData);
			}
			continue;
		}
		if (threadResultJson == null) {
			console.debug("threadResultJson was null!");
			threadData.errorStrikes++;
			watchedThreads.set(threadKey, threadData);
			continue;
		}
		for (const post of threadResultJson.posts) {
			if (!threadData.knownPosts.has(post.no)) {
				if ("tim" in post) {
					postQueue.push({
						postId: post.no,
						threadId: threadData.threadId,
						boardId: threadData.boardId,
						imgUrl: `https://i.4cdn.org/${threadData.boardId}/${post.tim}${post.ext}`
					});
					threadData.knownPosts.set(post.no, true);
				}
			}
		}
		if (threadResultJson.posts[0].archived || threadResultJson.posts[0].closed) {
			watchedThreads.delete(threadKey);
		}
		else {
			watchedThreads.set(threadKey, threadData);
		}
	}
}

export default async function init() {
	setTimeout(queueCheck, POST_TIMEOUT);
}
