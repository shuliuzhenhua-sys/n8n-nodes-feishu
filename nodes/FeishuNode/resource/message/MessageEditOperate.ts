import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const MessageEditOperate: ResourceOperations = {
	name: '编辑消息',
	value: 'message:edit',
	order: 30,
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
			options: [batchingOption, timeoutOption],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const msg_type = this.getNodeParameter('msg_type', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

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
				content = typeof post_content === 'string' ? post_content : JSON.stringify(post_content);
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
		const requestOptions: IHttpRequestOptions = {
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
