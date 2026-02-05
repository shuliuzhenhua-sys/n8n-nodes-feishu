/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';
import { feishuResponseManager } from '../help/utils/FeishuResponseManager';
import { configuredOutputs } from '../help/utils/outputs';

export class RespondToFeishu implements INodeType {
	description: INodeTypeDescription = {
		displayName: '飞书响应',
		name: 'respondToFeishu',
		icon: 'file:icon.svg',
		group: ['output'],
		version: 1,
		usableAsTool: undefined,
		subtitle:
			'={{$parameter["respondWith"] === "noResponse" ? "不返回任何响应" : "返回自定义 JSON 数据"}}',
		description: '同步响应飞书 Trigger 的请求',
		defaults: {
			name: '飞书响应',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: `={{(${configuredOutputs})($nodeVersion, $parameter)}}`,
		properties: [
			{
				displayName: '事件 ID',
				name: 'eventId',
				type: 'string',
				required: true,
				default: '={{ $json.event_id }}',
				description: '飞书触发器的事件 ID，必须与触发器的 event_id 保持一致。默认使用表达式自动获取。',
				placeholder: '{{ $json.event_id }}',
			},
			{
				displayName: '响应内容',
				name: 'respondWith',
				type: 'options',
				options: [
					{
						name: '无响应',
						value: 'noResponse',
						description: '不返回任何响应',
					},
					{
						name: '自定义 JSON',
						value: 'json',
						description: '返回自定义 JSON 数据',
					},
				],
				default: 'noResponse',
				description: '选择响应类型',
			},
			{
				displayName: '自定义响应 JSON',
				name: 'responseJson',
				type: 'json',
				default: JSON.stringify(
					{
						toast: {
							type: 'success',
							content: '卡片交互成功',
							i18n: {
								zh_cn: '卡片交互成功',
								en_us: 'card action success',
							},
						},
					},
					null,
					2,
				),
				description: '自定义返回给飞书的 JSON 数据',
				displayOptions: {
					show: {
						respondWith: ['json'],
					},
				},
			},
			{
				displayName: '启用响应输出分支',
				name: 'enableResponseOutput',
				type: 'boolean',
				default: false,
				description:
					'Whether to provide an additional output branch with the response sent to Feishu',
				isNodeSetting: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const respondWith = this.getNodeParameter('respondWith', 0) as string;
		const enableResponseOutput = this.getNodeParameter('enableResponseOutput', 0, false) as boolean;

		const responseItems: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const item = items[itemIndex];
			const json = item.json as IDataObject;

			// 获取 event_id（必填参数，用于关联 Trigger 和 Response）
			const eventId = this.getNodeParameter('eventId', itemIndex) as string;
			if (!eventId) {
				throw new NodeOperationError(
					this.getNode(),
					'事件 ID 不能为空，请确保填写了正确的 event_id（必须与飞书 Trigger 的 event_id 一致）',
					{ itemIndex },
				);
			}

			// 检查 responseMode（可选，不报错）
			const responseMode = json.responseMode as string;
			if (responseMode && responseMode !== 'responseNode') {
				this.logger.warn(
					`飞书 Trigger 的响应模式不是 "Using '飞书响应' Node"，当前模式: ${responseMode}`,
				);
			}

			// 构建响应数据
			let responseData: IDataObject = {};

			if (respondWith === 'json') {
				const responseJson = this.getNodeParameter('responseJson', itemIndex) as string;
				try {
					responseData = typeof responseJson === 'string' ? JSON.parse(responseJson) : responseJson;
				} catch (error) {
					throw new NodeOperationError(this.getNode(), '无效的 JSON 格式', { itemIndex });
				}
			}

			// 发送响应（使用 event_id 关联）
			const sent = feishuResponseManager.sendResponse(eventId, responseData);

			if (!sent) {
				this.logger.warn(`未找到等待响应的事件 ID: ${eventId}，可能已超时或已响应`);
			}

			// 构建响应输出项
			responseItems.push({
				json: {
					eventId,
					responseData,
					sent,
				},
			});
		}

		// 清理输入数据（移除内部字段）
		const cleanedItems = items.map((item) => {
			const cleanedJson = { ...item.json };
			delete cleanedJson.responseMode;
			return {
				...item,
				json: cleanedJson,
			};
		});

		// 根据是否启用响应输出分支返回不同的输出
		if (enableResponseOutput) {
			// 输出分支 1: Input Data（原始输入）
			// 输出分支 2: Response（响应数据）
			return [cleanedItems, responseItems];
		}

		// 单输出：返回清理后的输入数据
		return [cleanedItems];
	}
}
