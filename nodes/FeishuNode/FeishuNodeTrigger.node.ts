import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	NodeConnectionTypes,
	NodeOperationError,
	IRun,
	IDataObject,
} from 'n8n-workflow';
import { Credentials } from '../help/type/enums';
import { WSClient } from '../help/utils/feishu-sdk/ws-client';
import { EventDispatcher } from '../help/utils/feishu-sdk/handler/event-handler';
import { triggerEventProperty } from '../help/utils/properties';
import { FEISHU_RESPONSE_KEY } from './RespondToFeishu.node';

/**
 * 需要同步响应的事件类型集合
 * 飞书要求这些事件必须在 3 秒内返回响应数据，其他事件只需确认收到即可（fire-and-forget）
 */
const SYNC_RESPONSE_EVENTS = new Set([
	'card.action.trigger',
	'url.preview.get',
	'profile.view.get',
]);

/**
 * 飞书响应提取结果
 */
interface FeishuResponseResult {
	/** 响应数据 */
	response: IDataObject | null;
	/** 是否检测到多个响应节点（用于发出警告） */
	hasMultiple: boolean;
	/** 第一个响应所在的节点名称 */
	nodeName?: string;
}

/**
 * 从 IRun 执行结果中提取飞书响应数据
 * 遍历所有节点的输出，查找带有 customFeishuResponse 字段的响应
 *
 * 性能优化策略：
 * - 使用 for...in 代替 Object.keys() 避免中间数组分配
 * - 使用 in 操作符代替属性访问 + undefined 比较，减少属性查找开销
 * - 使用 labeled break 在找到第一个响应 + 确认是否有多个后立即退出全部循环
 * - 索引循环代替 for...of，避免迭代器开销
 *
 * 注意：
 * - 由于每次 emit() 触发独立的工作流执行，IRun 中只包含这次执行的结果
 * - 如果存在多个 RespondToFeishu 节点，只有第一个找到的响应会被使用（与 n8n Respond to Webhook 行为一致）
 *
 * @param run - 工作流执行结果
 * @returns 响应结果，包含响应数据、是否有多个响应、节点名称
 */
function extractFeishuResponse(run: IRun): FeishuResponseResult {
	const runData = run.data?.resultData?.runData;
	if (!runData) {
		return { response: null, hasMultiple: false };
	}

	let firstResponse: IDataObject | null = null;
	let firstNodeName: string | undefined;
	let hasMultiple = false;

	// 使用 labeled break 实现四层循环的提前退出
	// 只需找到第一个响应，以及是否存在第二个响应（用于警告）
	outerLoop: for (const nodeName in runData) {
		const nodeRunData = runData[nodeName];
		if (!nodeRunData) continue;

		// 每个节点可能有多次执行（例如循环中）
		for (let t = 0; t < nodeRunData.length; t++) {
			const outputs = nodeRunData[t].data?.main;
			if (!outputs) continue;

			// 遍历所有输出分支
			for (let o = 0; o < outputs.length; o++) {
				const outputItems = outputs[o];
				if (!outputItems) continue;

				// 遍历输出中的每个 item
				for (let i = 0; i < outputItems.length; i++) {
					const json = outputItems[i].json;

					// 使用 in 操作符检查标记键是否存在（比属性访问 + undefined 比较更快）
					if (json && FEISHU_RESPONSE_KEY in json) {
						if (firstResponse === null) {
							firstResponse = (json[FEISHU_RESPONSE_KEY] as IDataObject) || {};
							firstNodeName = nodeName;
						} else {
							// 已找到第二个响应，标记后立即退出所有循环
							hasMultiple = true;
							break outerLoop;
						}
					}
				}
			}
		}
	}

	return {
		response: firstResponse,
		hasMultiple,
		nodeName: firstNodeName,
	};
}

export class FeishuNodeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '飞书 Trigger',
		name: 'feishuNodeTrigger',
		icon: 'file:icon.svg',
		group: ['trigger'],
		version: [1, 2, 3],
		defaultVersion: 3,
		subtitle: '=已订阅 {{$parameter["events"].length}} 个事件',
		description: '通过 WebSocket 监听飞书事件，当事件发生时启动工作流',
		defaults: {
			name: '飞书 Trigger',
		},
		usableAsTool: undefined,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: Credentials.FeishuCredentialsApi,
				required: true,
				displayOptions: {
					show: {
						authentication: [Credentials.FeishuCredentialsApi],
					},
				},
			},
		],
		properties: [
			{
				displayName: '认证方式',
				name: 'authentication',
				type: 'options',
				default: `${Credentials.FeishuCredentialsApi}`,
				options: [
					{
						name: 'Tenant Access Token',
						value: Credentials.FeishuCredentialsApi,
					},
				],
			},
			{
				displayName:
					'此 Trigger 使用 WebSocket 长连接方式接收事件。由于飞书 API 限制，每个飞书应用同时只能有一个 Trigger 在运行。',
				name: 'FeishuTriggerNotice',
				type: 'notice',
				default: '',
			},
			triggerEventProperty,
			{
				displayName: '响应模式',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Immediately',
						value: 'immediately',
						description: '事件触发后立即响应',
					},
					{
						name: "Using '飞书响应' Node",
						value: 'responseNode',
						description: '使用飞书响应节点同步返回响应',
					},
				],
				default: 'immediately',
				description: '选择何时向飞书发送响应',
			},
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				options: [
					{
						displayName: '回调提示信息',
						name: 'callbackToast',
						type: 'string',
						default: '',
						description:
							'设置回调触发时显示给用户的提示信息。如果不设置，则不显示任何提示。仅在 Immediately 模式下有效。',
						displayOptions: {
							show: {
								'/responseMode': ['immediately'],
							},
						},
					},
					{
						displayName: '响应超时时间',
						name: 'responseTimeout',
						type: 'number',
						default: 3000,
						description: '等待飞书响应节点响应的最大时间（毫秒），超时后将返回空响应',
						displayOptions: {
							show: {
								'/responseMode': ['responseNode'],
							},
						},
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials(Credentials.FeishuCredentialsApi);

		if (!(credentials.appid && credentials.appsecret && credentials.baseURL)) {
			throw new NodeOperationError(this.getNode(), '缺少必要的飞书凭证配置');
		}

		const responseMode = this.getNodeParameter('responseMode', 'immediately') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const callbackToast = (options.callbackToast as string) || undefined;
		// 使用与 UI 默认值一致的 3000ms
		const responseTimeout = (options.responseTimeout as number) || 3000;

		const appId = credentials['appid'] as string;
		const appSecret = credentials['appsecret'] as string;
		const baseUrl = credentials['baseURL'] as string;

		const wsClient: WSClient = new WSClient({
			appId,
			appSecret,
			domain: `${baseUrl}`,
			logger: this.logger,
			helpers: this.helpers,
		});

		const closeFunction = async () => {
			await wsClient.stop();
		};

		const startWsClient = async () => {
			const events = this.getNodeParameter('events', []) as string[];
			const isAnyEvent = events.includes('any_event');
			const handlers: Record<string, (data: IDataObject) => Promise<IDataObject>> = {};

		for (const event of events) {
			handlers[event] = async (data) => {
				// 对于 any_event，需要在运行时从数据中获取实际事件类型；否则用注册时的事件类型
				const actualEventType = isAnyEvent ? (data.event_type as string) : event;
				const isSyncEvent = SYNC_RESPONSE_EVENTS.has(actualEventType);

				const enrichedData = {
					...data,
					responseMode,
				};

				// 非同步事件：即发即忘，无需等待工作流完成也无需返回响应数据
				if (!isSyncEvent) {
					this.emit([this.helpers.returnJsonArray(enrichedData)]);
					return {};
				}

				// ── 以下仅处理需要同步响应的事件（card.action.trigger / url.preview.get / profile.view.get）──

				const donePromise = this.helpers.createDeferredPromise<IRun>();
				const eventId = data.event_id as string;
				if (!eventId) {
					this.logger.warn('飞书同步事件数据中未找到 event_id，响应模式可能无法正常工作');
				}

				if (responseMode === 'immediately') {
					this.emit([this.helpers.returnJsonArray(enrichedData)], undefined, donePromise);
					if (callbackToast) {
						return {
							toast: {
								type: 'info',
								content: callbackToast,
							},
						};
					}
					return {};
				}

				// responseNode 模式：等待工作流执行完成，从 IRun 结果中提取响应
				if (!eventId) {
					this.emit([this.helpers.returnJsonArray(enrichedData)], undefined, donePromise);
					return {};
				}

				this.emit([this.helpers.returnJsonArray(enrichedData)], undefined, donePromise);

				let timeoutId: ReturnType<typeof setTimeout> | undefined;
				try {
					const executionResult = await Promise.race([
						donePromise.promise,
						new Promise<never>((_, reject) => {
							timeoutId = setTimeout(
								() => reject(new Error(`等待工作流执行超时 (${responseTimeout}ms)`)),
								responseTimeout,
							);
						}),
					]);

					clearTimeout(timeoutId);

					if (!executionResult?.data?.resultData?.runData) {
						this.logger.warn(
							`[飞书响应模式] IRun 结果结构不完整，可能在多 Worker 模式下存在问题`,
						);
					}

					const { response, hasMultiple, nodeName } = extractFeishuResponse(executionResult);

					if (hasMultiple) {
						this.logger.warn(
							`[飞书响应模式] 检测到多个飞书响应节点，只有第一个节点 "${nodeName}" 的响应会被使用。` +
								`建议：工作流中只保留一个"飞书响应"节点，或确保只有一个分支会执行。`,
						);
					}

					if (response) {
						return response;
					} else {
						this.logger.warn(
							`[飞书响应模式] 未在执行结果中找到飞书响应节点的输出。请确保工作流中包含"飞书响应"节点。`,
						);
						return {};
					}
				} catch (error) {
					clearTimeout(timeoutId);
					const errorMessage = error instanceof Error ? error.message : String(error);
					this.logger.warn(
						`[飞书响应模式] 等待工作流执行超时或出错: ${errorMessage}，event_id: ${eventId}`,
					);
					return {};
				}
			};
		}

			const eventDispatcher = new EventDispatcher({ logger: this.logger, isAnyEvent }).register(
				handlers,
			);

			await wsClient.start({ eventDispatcher });
		};

		if (this.getMode() !== 'manual') {
			await startWsClient();
			return {
				closeFunction,
			};
		} else {
			const manualTriggerFunction = async () => {
				await startWsClient();
			};

			return {
				closeFunction,
				manualTriggerFunction,
			};
		}
	}
}
