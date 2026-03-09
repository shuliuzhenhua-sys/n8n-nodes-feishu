import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
	IHttpRequestOptions,
	sleep,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { timeoutOption, paginationOptions } from '../../../help/utils/sharedOptions';

/**
 * Token bucket rate limiter.
 * Allows initial bursting up to maxTokens, then throttles to sustain the target rate.
 */
class TokenBucketRateLimiter {
	private tokens: number;
	private readonly maxTokens: number;
	private readonly refillRatePerMs: number;
	private lastRefillTime: number;

	constructor(maxRequestsPerSecond: number) {
		this.maxTokens = maxRequestsPerSecond;
		this.tokens = maxRequestsPerSecond;
		this.refillRatePerMs = maxRequestsPerSecond / 1_000;
		this.lastRefillTime = Date.now();
	}

	private refill(): void {
		const now = Date.now();
		const elapsed = now - this.lastRefillTime;
		this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs);
		this.lastRefillTime = now;
	}

	async acquire(): Promise<void> {
		this.refill();
		if (this.tokens < 1) {
			const waitMs = Math.ceil((1 - this.tokens) / this.refillRatePerMs);
			await sleep(waitMs);
			this.refill();
		}
		this.tokens -= 1;
	}
}

/**
 * Work queue with bounded concurrency.
 * Workers continuously pull from a shared queue; newly discovered items
 * are pushed immediately without waiting for the current "level" to finish,
 * eliminating inter-level idle time in deep trees.
 *
 * @param initialItems - seed items to start processing
 * @param concurrency  - max parallel workers
 * @param processor    - handles one item, returns new items to enqueue
 */
async function processWorkQueue<T>(
	initialItems: T[],
	concurrency: number,
	processor: (item: T) => Promise<T[]>,
): Promise<void> {
	const queue: T[] = [...initialItems];
	let nextIndex = 0;
	let activeTasks = 0;
	let waitingWorkers: Array<() => void> = [];

	const wakeAll = () => {
		waitingWorkers.splice(0).forEach((resolve) => resolve());
	};

	const waitForChange = () =>
		new Promise<void>((resolve) => {
			waitingWorkers.push(resolve);
		});

	async function worker(): Promise<void> {
		while (true) {
			if (nextIndex < queue.length) {
				const idx = nextIndex++;
				activeTasks++;
				const newItems = await processor(queue[idx]);
				if (newItems.length > 0) {
					queue.push(...newItems);
				}
				activeTasks--;
				wakeAll();
			} else if (activeTasks > 0) {
				await waitForChange();
			} else {
				break;
			}
		}
	}

	const workers = Array(Math.min(concurrency, Math.max(queue.length, 1)))
		.fill(null)
		.map(() => worker());

	await Promise.all(workers);
}

const WikiSpacesNodeGetChildrenOperate: ResourceOperations = {
	name: '获取知识空间子节点列表',
	value: 'wiki:spaces:node:children',
	order: 110,
	options: [
		{
			displayName: '知识空间ID',
			name: 'space_id',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '父节点Token',
			name: 'parent_node_token',
			// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
			type: 'string',
			default: '',
		},
		paginationOptions.returnAll,
		paginationOptions.limit(50),
		{
			displayName: '递归获取所有子节点',
			name: 'recursive',
			type: 'boolean',
			default: false,
			description: 'Whether to recursively fetch all child nodes',
		},
		{
			displayName: '递归层级',
			name: 'recursiveDepth',
			type: 'number',
			default: 2,
			typeOptions: {
				minValue: 0,
			},
			displayOptions: {
				show: {
					recursive: [true],
				},
			},
			description: '递归获取的层级深度，0表示递归获取所有层级',
		},
		{
			displayName: '数据结构',
			name: 'dataStructure',
			type: 'options',
			options: [
				{ name: '扁平化数据结构', value: 'flat' },
				{ name: '树形数据结构', value: 'tree' },
			],
			default: 'flat',
			displayOptions: {
				show: {
					recursive: [true],
				},
			},
			description: '返回数据的结构类型',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: '递归并发数',
					name: 'recursiveConcurrency',
					type: 'number',
					default: 5,
					typeOptions: {
						minValue: 1,
						maxValue: 10,
					},
					description:
						'递归获取子节点时的最大并发请求数。配合频率限制自动调度，默认5并发可有效利用频控。',
				},
				{
					displayName: '频率限制（次/秒）',
					name: 'rateLimit',
					type: 'number',
					default: 2,
					typeOptions: {
						minValue: 1,
					},
					description:
						'接口频率限制，默认2次/秒（约100次/分钟）。Token Bucket 算法会自动最大化利用该频控。',
				},
				timeoutOption,
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject[]> {
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const limit = this.getNodeParameter('limit', index, 50) as number;
		const spaceId = this.getNodeParameter('space_id', index) as string;
		const parentNodeToken = this.getNodeParameter('parent_node_token', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
			recursiveConcurrency?: number;
			rateLimit?: number;
		};
		const recursive = this.getNodeParameter('recursive', index, false) as boolean;

		let rateLimiter: TokenBucketRateLimiter | undefined;
		if (recursive) {
			const rateLimit = options.rateLimit ?? 2;
			rateLimiter = new TokenBucketRateLimiter(rateLimit);
		}

		const fetchChildren = async (
			targetSpaceId: string,
			targetParentNodeToken: string | undefined,
			limiter?: TokenBucketRateLimiter,
		): Promise<IDataObject[]> => {
			let allItems: IDataObject[] = [];
			let pageToken: string | undefined = undefined;

			while (true) {
				if (limiter) await limiter.acquire();

				const qs: IDataObject = {
					page_size: 50,
				};

				if (targetParentNodeToken) {
					qs.parent_node_token = targetParentNodeToken;
				}

				if (pageToken) {
					qs.page_token = pageToken;
				}

				const requestOptions: IHttpRequestOptions = {
					method: 'GET' as IHttpRequestMethods,
					url: `/open-apis/wiki/v2/spaces/${targetSpaceId}/nodes`,
					qs,
				};

				if (options.timeout) {
					requestOptions.timeout = options.timeout;
				}

				const response = await RequestUtils.request.call(this, requestOptions);

				const responseData = response as {
					items?: IDataObject[];
					page_token?: string;
					has_more?: boolean;
				};

				allItems = allItems.concat(responseData.items || []);

				if (!responseData.has_more || !responseData.page_token) {
					break;
				}

				pageToken = responseData.page_token;
			}

			return allItems;
		};

		const fetchPage = async (pageToken: string | undefined, pageSize: number) => {
			const qs: IDataObject = {
				page_size: pageSize,
			};

			if (parentNodeToken) {
				qs.parent_node_token = parentNodeToken;
			}

			if (pageToken) {
				qs.page_token = pageToken;
			}

			const requestOptions: IHttpRequestOptions = {
				method: 'GET' as IHttpRequestMethods,
				url: `/open-apis/wiki/v2/spaces/${spaceId}/nodes`,
				qs,
			};

			if (options.timeout) {
				requestOptions.timeout = options.timeout;
			}

			const response = await RequestUtils.request.call(this, requestOptions);

			const responseData = response as {
				items?: IDataObject[];
				page_token?: string;
				has_more?: boolean;
			};

			return {
				items: responseData.items || [],
				pageToken: responseData.page_token,
				hasMore: responseData.has_more || false,
			};
		};

		/**
		 * Work-queue based flat recursive fetch.
		 * Newly discovered child nodes are enqueued immediately — workers never idle
		 * waiting for an entire depth level to finish (cross-level pipelining).
		 */
		const fetchRecursiveFlat = async (
			initialItems: IDataObject[],
			recursiveDepth: number,
			concurrency: number,
			limiter: TokenBucketRateLimiter,
		): Promise<IDataObject[]> => {
			const results: IDataObject[] = [];

			type Task = { item: IDataObject; path: string[]; depth: number };
			const seed: Task[] = initialItems.map((item) => ({
				item,
				path: [item.title as string],
				depth: 1,
			}));

			await processWorkQueue<Task>(seed, concurrency, async ({ item, path, depth }) => {
				results.push({ ...item, breadcrumbItems: path });

				if (item.has_child && (recursiveDepth === 0 || depth < recursiveDepth)) {
					const children = await fetchChildren(
						item.space_id as string,
						item.node_token as string,
						limiter,
					);
					return children.map((child) => ({
						item: child,
						path: [...path, child.title as string],
						depth: depth + 1,
					}));
				}
				return [];
			});

			return results;
		};

		/**
		 * Work-queue based tree recursive fetch.
		 * Same cross-level pipelining, but attaches children arrays to parent nodes
		 * to preserve the tree structure.
		 */
		const fetchRecursiveTree = async (
			initialItems: IDataObject[],
			recursiveDepth: number,
			concurrency: number,
			limiter: TokenBucketRateLimiter,
		): Promise<IDataObject[]> => {
			type TreeNode = IDataObject & { children?: TreeNode[] };
			type Task = { node: TreeNode; path: string[]; depth: number };

			const rootNodes: TreeNode[] = initialItems.map((item) => ({
				...item,
				breadcrumbItems: [item.title as string],
				children: [],
			}));

			const seed: Task[] = rootNodes.map((node) => ({
				node,
				path: [node.title as string],
				depth: 1,
			}));

			await processWorkQueue<Task>(seed, concurrency, async ({ node, path, depth }) => {
				if (node.has_child && (recursiveDepth === 0 || depth < recursiveDepth)) {
					const children = await fetchChildren(
						node.space_id as string,
						node.node_token as string,
						limiter,
					);
					const childNodes: TreeNode[] = children.map((child) => ({
						...child,
						breadcrumbItems: [...path, child.title as string],
						children: [],
					}));
					node.children = childNodes;
					return childNodes.map((cn) => ({
						node: cn,
						path: [...path, cn.title as string],
						depth: depth + 1,
					}));
				}
				return [];
			});

			return rootNodes;
		};

		if (returnAll) {
			const initialItems = await fetchChildren(
				spaceId,
				parentNodeToken || undefined,
				rateLimiter,
			);

			if (!recursive) {
				return initialItems.map((item) => ({
					...item,
					breadcrumbItems: [item.title as string],
				}));
			}

			const recursiveDepth = this.getNodeParameter('recursiveDepth', index, 2) as number;
			const dataStructure = this.getNodeParameter('dataStructure', index, 'flat') as string;
			const concurrency = options.recursiveConcurrency ?? 5;

			if (dataStructure === 'flat') {
				return await fetchRecursiveFlat(
					initialItems,
					recursiveDepth,
					concurrency,
					rateLimiter!,
				);
			} else {
				return await fetchRecursiveTree(
					initialItems,
					recursiveDepth,
					concurrency,
					rateLimiter!,
				);
			}
		} else {
			const { items } = await fetchPage(undefined, limit);

			if (!recursive) {
				return items.map((item) => ({
					...item,
					breadcrumbItems: [item.title as string],
				}));
			}

			const recursiveDepth = this.getNodeParameter('recursiveDepth', index, 2) as number;
			const dataStructure = this.getNodeParameter('dataStructure', index, 'flat') as string;
			const concurrency = options.recursiveConcurrency ?? 5;

			if (dataStructure === 'flat') {
				return await fetchRecursiveFlat(items, recursiveDepth, concurrency, rateLimiter!);
			} else {
				return await fetchRecursiveTree(items, recursiveDepth, concurrency, rateLimiter!);
			}
		}
	},
};

export default WikiSpacesNodeGetChildrenOperate;
