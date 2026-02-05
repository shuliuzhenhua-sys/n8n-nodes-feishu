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
import { FEISHU_RESPONSE_MARKER } from './RespondToFeishu.node';

/**
 * 从 IRun 执行结果中提取飞书响应数据
 * 遍历所有节点的输出，查找带有 FEISHU_RESPONSE_MARKER 标记且 eventId 匹配的响应
 *
 * @param run - 工作流执行结果
 * @param eventId - 要匹配的事件 ID
 * @returns 响应数据，如果未找到则返回 null
 */
function extractFeishuResponse(run: IRun, eventId: string): IDataObject | null {
	const resultData: IRunExecutionData | undefined = run.data;
	if (!resultData?.resultData?.runData) {
		return null;
	}

	const runData = resultData.resultData.runData;

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

					// 查找带有飞书响应标记且 eventId 匹配的数据
					if (json?.[FEISHU_RESPONSE_MARKER] === true && json?.eventId === eventId) {
						return (json.responseData as IDataObject) || {};
					}
				}
			}
		}
	}

	return null;
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
					this.logger.info(`已处理事件: ${event}, event_id: ${eventId}`);

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
						this.logger.error('event_id 为空，无法关联响应，直接返回空响应');
						return {};
					}

					// 触发工作流执行，并等待 donePromise 完成
					this.emit([this.helpers.returnJsonArray(enrichedData)], undefined, donePromise);
					this.logger.info(
						`[飞书响应模式] 已触发工作流执行，等待 donePromise 完成，event_id: ${eventId}, timeout: ${responseTimeout}ms`,
					);

					try {
						const startTime = Date.now();

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

						const elapsed = Date.now() - startTime;
						this.logger.info(
							`[飞书响应模式] donePromise 已完成，耗时: ${elapsed}ms，event_id: ${eventId}`,
						);

						// 验证 IRun 结果结构
						if (!executionResult?.data?.resultData?.runData) {
							this.logger.warn(
								`[飞书响应模式] IRun 结果结构不完整，可能在多 Worker 模式下存在问题。event_id: ${eventId}`,
							);
						}

						// 从执行结果中提取飞书响应数据
						const response = extractFeishuResponse(executionResult, eventId);

						if (response) {
							this.logger.info(
								`[飞书响应模式] 成功从执行结果中提取飞书响应: ${JSON.stringify(response)}`,
							);
							return response;
						} else {
							this.logger.warn(
								`[飞书响应模式] 未在执行结果中找到飞书响应节点的输出，eventId: ${eventId}。请确保工作流中包含"飞书响应"节点。`,
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
