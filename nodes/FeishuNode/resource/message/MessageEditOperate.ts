import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	sleep,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

interface RequestOptions {
	batching?: { batch?: { batchSize?: number; batchInterval?: number } };
	timeout?: number;
}

const MessageEditOperate: ResourceOperations = {
	name: '编辑消息',
	value: 'message:edit',
	options: [
		{
			displayName: '待编辑的消息的ID',
			name: 'message_id',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '消息类型',
			name: 'msg_type',
			type: 'options',
			options: [
				{ name: '文本', value: 'text' },
				{ name: '富文本', value: 'post' },
			],
			description: '消息类型（编辑消息仅支持文本和富文本）',
			required: true,
			default: 'text',
		},
		// 文本消息 - text
		{
			displayName: '文本内容',
			name: 'text_content',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			required: true,
			default: '',
			description: '文本消息内容，支持 @用户 和 @所有人',
			displayOptions: {
				show: {
					msg_type: ['text'],
				},
			},
		},
		// 富文本消息 - post
		{
			displayName: '富文本内容',
			name: 'post_content',
			type: 'json',
			required: true,
			default: JSON.stringify(
				{ zh_cn: { title: '标题', content: [[{ tag: 'text', text: '文本内容' }]] } },
				null,
				2,
			),
			description: '富文本消息内容，JSON 格式',
			displayOptions: {
				show: {
					msg_type: ['post'],
				},
			},
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
										minValue: -1,
									},
									default: 50,
									description:
										'输入将被分批处理以限制请求。 -1 表示禁用。0 将被视为 1。',
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
		const message_id = this.getNodeParameter('message_id', index) as string;
		const msg_type = this.getNodeParameter('msg_type', index) as string;
		const options = this.getNodeParameter('options', index, {}) as RequestOptions;

		// 处理批次延迟
		const handleBatchDelay = async (): Promise<void> => {
			const batchSize = options.batching?.batch?.batchSize ?? -1;
			const batchInterval = options.batching?.batch?.batchInterval ?? 0;

			if (index > 0 && batchSize >= 0 && batchInterval > 0) {
				const effectiveBatchSize = batchSize > 0 ? batchSize : 1;
				if (index % effectiveBatchSize === 0) {
					await sleep(batchInterval);
				}
			}
		};

		await handleBatchDelay();

		// 根据消息类型构建 content
		let content: string;
		switch (msg_type) {
			case 'text': {
				const text_content = this.getNodeParameter('text_content', index) as string;
				content = JSON.stringify({ text: text_content });
				break;
			}
			case 'post': {
				const post_content = this.getNodeParameter('post_content', index);
				content =
					typeof post_content === 'string' ? post_content : JSON.stringify(post_content);
				break;
			}
			default:
				content = '{}';
		}

		const body: IDataObject = {
			msg_type,
			content,
		};

		// 构建请求选项
		const requestOptions: any = {
			method: 'PUT',
			url: `/open-apis/im/v1/messages/${message_id}`,
			body,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default MessageEditOperate;
