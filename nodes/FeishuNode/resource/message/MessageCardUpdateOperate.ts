import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const MessageCardUpdateOperate: ResourceOperations = {
	name: '更新已发送的消息卡片',
	value: 'message:cardUpdate',
	order: 100,
	options: [
		{
			displayName: '消息ID',
			name: 'message_id',
			type: 'string',
			required: true,
			default: '',
			description:
				'待更新的消息 ID，仅支持更新卡片（消息类型为 interactive）。可通过发送消息接口的响应结果获取。',
		},
		{
			displayName: '卡片内容',
			name: 'content',
			type: 'json',
			default: JSON.stringify(
				{
					elements: [
						{ tag: 'div', text: { content: 'This is the plain text', tag: 'plain_text' } },
					],
					header: { template: 'blue', title: { content: 'This is the title', tag: 'plain_text' } },
				},
				null,
				2,
			),
			description:
				'消息卡片的内容，支持卡片 JSON 或搭建工具构建的卡片，需为 JSON 结构序列化后的字符串。更新的卡片消息最大不能超过 30 KB。',
			required: true,
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [batchingOption, timeoutOption],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const content = this.getNodeParameter('content', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const body: IDataObject = {
			content: typeof content === 'string' ? content : JSON.stringify(content),
		};

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'PATCH',
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

export default MessageCardUpdateOperate;
