import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const DocGetContentOperate: ResourceOperations = {
	name: '获取云文档内容',
	value: 'doc:getContent',
	options: [
		{
			displayName: '文档 Token',
			name: 'doc_token',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
			description: '云文档的唯一标识，长度 22 ~ 27 字符',
		},
		{
			displayName: '云文档类型',
			name: 'doc_type',
			type: 'options',
			required: true,
			default: 'docx',
			options: [
			{
				name: 'Docx (新版文档)',
				value: 'docx',
			},
		],
	},
		{
			displayName: '内容类型',
			name: 'content_type',
			type: 'options',
			required: true,
			default: 'markdown',
			options: [
			{
				name: 'Markdown',
				value: 'markdown',
				description: 'Markdown 格式',
			},
		],
	},
		{
			displayName: '语言',
			name: 'lang',
			type: 'options',
			default: 'zh',
			options: [
				{
					name: '中文',
					value: 'zh',
				},
				{
					name: '英文',
					value: 'en',
				},
				{
					name: '日文',
					value: 'ja',
				},
			],
			description: '云文档中存在 @用户 元素时，指定该用户名称的语言。默认 zh，即中文。',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const doc_token = this.getNodeParameter('doc_token', index) as string;
		const doc_type = this.getNodeParameter('doc_type', index) as string;
		const content_type = this.getNodeParameter('content_type', index) as string;
		const lang = this.getNodeParameter('lang', index, 'zh') as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const qs: IDataObject = { doc_token, doc_type, content_type, lang };

		const requestOptions: IDataObject = {
			method: 'GET',
			url: '/open-apis/docs/v1/content',
			qs,
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default DocGetContentOperate;
