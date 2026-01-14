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
import { WSClient } from '../help/utils/lark-sdk/ws-client';
import { EventDispatcher } from '../help/utils/lark-sdk/handler/event-handler';
import { triggerEventProperty } from '../help/utils/properties';

export class FeishuNodeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '飞书 Trigger',
		name: 'feishuNodeTrigger',
		icon: 'file:icon.svg',
		group: ['trigger'],
		version: [1, 2],
		defaultVersion: 2,
		subtitle: '=事件: {{$parameter["events"].join(", ")}}',
		description: '通过 WebSocket 监听飞书事件，当事件发生时启动工作流',
		defaults: {
			name: '飞书 Trigger',
		},
		usableAsTool: true,
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
							'设置回调触发时显示给用户的提示信息。如果不设置，则不显示任何提示。',
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

		const options = this.getNodeParameter('options', {}) as IDataObject;
		const callbackToast = (options.callbackToast as string) || undefined;

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
			const handlers: Record<string, (data: any) => Promise<IDataObject>> = {};

			for (const event of events) {
				handlers[event] = async (data) => {
					let donePromise = undefined;

					donePromise = this.helpers.createDeferredPromise<IRun>();
					this.emit([this.helpers.returnJsonArray(data)], undefined, donePromise);

					this.logger.info(`已处理事件: ${event}`);

					if (callbackToast) {
						return {
							toast: {
								type: 'info',
								content: callbackToast,
							},
						};
					}

					return {};
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
