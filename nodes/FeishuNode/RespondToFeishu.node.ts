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
		usableAsTool: true,
		subtitle: '={{$parameter["respondWith"] === "noResponse" ? "不返回任何响应" : "返回自定义 JSON 数据"}}',
		description: '同步响应飞书 Trigger 的请求',
		defaults: {
			name: '飞书响应',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: `={{(${configuredOutputs})($nodeVersion, $parameter)}}`,
		properties: [
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
				default: JSON.stringify({
					toast: {
						type: 'success',
						content: '卡片交互成功',
						i18n: {
							zh_cn: '卡片交互成功',
							en_us: 'card action success',
						},
					},
				}, null, 2),
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

			// 获取 correlationId（用于关联 Trigger 和 Response）
			const correlationId = json.correlationId as string;
			if (!correlationId) {
				this.logger.warn(`未找到 correlationId，可能不是从飞书 Trigger 触发的`);
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
					throw new NodeOperationError(
						this.getNode(),
						'无效的 JSON 格式',
						{ itemIndex },
					);
				}
			}

			// 发送响应（使用 correlationId 关联）
			const sent = correlationId ? feishuResponseManager.sendResponse(correlationId, responseData) : false;

			if (!sent) {
				this.logger.warn(`未找到等待响应的关联 ID: ${correlationId}，可能已超时或已响应`);
			}

			// 构建响应输出项
			responseItems.push({
				json: {
					correlationId,
					responseData,
					sent,
				},
			});
		}

		// 清理输入数据（移除内部字段）
		const cleanedItems = items.map((item) => {
			const cleanedJson = { ...item.json };
			delete cleanedJson.responseMode;
			delete cleanedJson.correlationId;
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
