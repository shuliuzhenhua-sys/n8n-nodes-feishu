import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	NodeConnectionTypes,
	NodeOperationError,
	IRun,
	IDataObject,
	IRunExecutionData,
} from 'n8n-workflow';
import { Credentials } from '../help/type/enums';
import { WSClient } from '../help/utils/feishu-sdk/ws-client';
import { EventDispatcher } from '../help/utils/feishu-sdk/handler/event-handler';
import { triggerEventProperty } from '../help/utils/properties';
import { FEISHU_RESPONSE_KEY } from './RespondToFeishu.node';

/**
 * 飞书响应提取结果
 */
interface FeishuResponseResult {
	/** 响应数据 */
	response: IDataObject | null;
	/** 找到的响应节点数量 */
	count: number;
	/** 第一个响应所在的节点名称 */
	nodeName?: string;
}

/**
 * 从 IRun 执行结果中提取飞书响应数据
 * 遍历所有节点的输出，查找带有 customFeishuResponse 字段的响应
 *
 * 注意：
 * - 由于每次 emit() 触发独立的工作流执行，IRun 中只包含这次执行的结果
 * - 如果存在多个 RespondToFeishu 节点，只有第一个找到的响应会被使用（与 n8n Respond to Webhook 行为一致）
 *
 * @param run - 工作流执行结果
 * @returns 响应结果，包含响应数据、响应数量和节点名称
 */
function extractFeishuResponse(run: IRun): FeishuResponseResult {
	const resultData: IRunExecutionData | undefined = run.data;
	if (!resultData?.resultData?.runData) {
		return { response: null, count: 0 };
	}

	const runData = resultData.resultData.runData;
	let firstResponse: IDataObject | null = null;
	let firstNodeName: string | undefined;
	let responseCount = 0;

	// 遍历所有节点的执行结果
	for (const nodeName of Object.keys(runData)) {
		const nodeRunData = runData[nodeName];
		if (!nodeRunData) continue;

		// 每个节点可能有多次执行（例如循环中）
		for (const taskData of nodeRunData) {
			const outputs = taskData.data?.main;
			if (!outputs) continue;

			// 遍历所有输出分支
			for (const outputItems of outputs) {
				if (!outputItems) continue;

				// 遍历输出中的每个 item
				for (const item of outputItems) {
					const json = item.json as IDataObject;

					// 查找带有飞书自定义响应的数据
					if (json?.[FEISHU_RESPONSE_KEY] !== undefined) {
						responseCount++;
						if (firstResponse === null) {
							firstResponse = (json[FEISHU_RESPONSE_KEY] as IDataObject) || {};
							firstNodeName = nodeName;
						}
					}
				}
			}
		}
	}

	return {
		response: firstResponse,
		count: responseCount,
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
				const donePromise = this.helpers.createDeferredPromise<IRun>();

				// 使用飞书原生的 event_id 作为关联标识符（绝对唯一）
				const eventId = data.event_id as string;
				if (!eventId) {
					this.logger.warn('飞书事件数据中未找到 event_id，响应模式可能无法正常工作');
				}

				// 将 responseMode 注入到数据中（用于后续节点判断）
				const enrichedData = {
					...data,
					responseMode,
				};

				if (responseMode === 'immediately') {
					// 立即响应模式：先 emit，然后立即返回
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
				} else {
					// 使用 Respond to Feishu 节点响应模式
					// 新机制：通过 donePromise 等待工作流执行完成，然后从 IRun 结果中提取响应
					// 这种方式支持多 Worker 模式，因为响应数据通过 n8n 的执行结果机制传递
					if (!eventId) {
						this.emit([this.helpers.returnJsonArray(enrichedData)], undefined, donePromise);
						return {};
					}

					// 触发工作流执行，并等待 donePromise 完成
					this.emit([this.helpers.returnJsonArray(enrichedData)], undefined, donePromise);

					try {
						// 使用 Promise.race 实现超时控制
						const executionResult = await Promise.race([
							donePromise.promise,
							new Promise<never>((_, reject) =>
								setTimeout(
									() => reject(new Error(`等待工作流执行超时 (${responseTimeout}ms)`)),
									responseTimeout,
								),
							),
						]);

						// 验证 IRun 结果结构
						if (!executionResult?.data?.resultData?.runData) {
							this.logger.warn(
								`[飞书响应模式] IRun 结果结构不完整，可能在多 Worker 模式下存在问题`,
							);
						}

						// 从执行结果中提取飞书响应数据
						const { response, count, nodeName } = extractFeishuResponse(executionResult);

						// 如果存在多个响应节点，发出警告
						if (count > 1) {
							this.logger.warn(
								`[飞书响应模式] 检测到 ${count} 个飞书响应节点，只有第一个节点 "${nodeName}" 的响应会被使用。` +
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
						const errorMessage = error instanceof Error ? error.message : String(error);
						this.logger.warn(
							`[飞书响应模式] 等待工作流执行超时或出错: ${errorMessage}，event_id: ${eventId}`,
						);
						return {};
					}
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
