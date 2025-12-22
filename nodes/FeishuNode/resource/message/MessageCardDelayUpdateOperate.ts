import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const MessageCardDelayUpdateOperate: ResourceOperations = {
	name: '延时更新消息卡片',
	value: 'message:cardDelayUpdate',
	options: [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
			description: '卡片回传交互回调中包含的 token 参数值',
		},
		{
			displayName: '卡片内容',
			name: 'card',
			type: 'json',
			required: true,
			default:
				'{"elements":[{"tag":"div","text":{"tag":"plain_text","content":"This is plain text"}}]}',
			description: '消息卡片的内容，可以是卡片 JSON 数据，也可传入卡片搭建工具搭建的卡片相关信息',
		},
		{
			displayName: '指定用户更新（Open IDs）',
			name: 'open_ids',
			type: 'string',
			default: '',
			description:
				'用户的 open_id 列表，用于定义接收更新卡片的用户范围。多个用逗号分隔。仅支持卡片 JSON 1.0 结构，且仅在卡片的 config.update_multi 参数设置为 false（即独享卡片）时可用。',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Batching',
					name: 'batching',
					placeholder: 'Add Batching',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: false,
					},
					default: {
						batch: {},
					},
					options: [
						{
							displayName: 'Batching',
							name: 'batch',
							values: [
								{
									displayName: 'Items per Batch',
									name: 'batchSize',
									type: 'number',
									typeOptions: {
										minValue: 1,
									},
									default: 50,
									description:
										'每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。',
								},
								{
									displayName: 'Batch Interval (Ms)',
									name: 'batchInterval',
									type: 'number',
									typeOptions: {
										minValue: 0,
									},
									default: 1000,
									description: '每批请求之间的时间（毫秒）。0 表示禁用。',
								},
							],
						},
					],
				},
				{
					displayName: 'Timeout',
					name: 'timeout',
					type: 'number',
					typeOptions: {
						minValue: 0,
					},
					default: 0,
					description:
						'等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。',
				},
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const token = this.getNodeParameter('token', index) as string;
		const card = this.getNodeParameter('card', index) as string | object;
		const open_ids_str = this.getNodeParameter('open_ids', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		// 解析 card 参数
		let cardObj: IDataObject;
		if (typeof card === 'string') {
			try {
				cardObj = JSON.parse(card) as IDataObject;
			} catch {
				cardObj = { elements: [] };
			}
		} else {
			cardObj = card as IDataObject;
		}

		// 处理 open_ids
		if (open_ids_str && open_ids_str.trim()) {
			const open_ids = open_ids_str
				.split(',')
				.map((id) => id.trim())
				.filter((id) => id);
			if (open_ids.length > 0) {
				cardObj.open_ids = open_ids;
			}
		}

		const body: IDataObject = {
			token,
			card: cardObj,
		};

		// 构建请求选项
		const requestOptions: IDataObject = {
			method: 'POST',
			url: '/open-apis/interactive/v1/card/update',
			body,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default MessageCardDelayUpdateOperate;
