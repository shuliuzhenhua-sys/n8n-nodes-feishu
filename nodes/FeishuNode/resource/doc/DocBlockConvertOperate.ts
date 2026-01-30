import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const DocBlockConvertOperate: ResourceOperations = {
	name: 'Markdown/HTML 内容转换为文档块',
	value: 'doc:block:convert',
	order: 110,
	options: [
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
				{
					name: 'HTML',
					value: 'html',
					description: 'HTML 格式',
				},
			],
		},
		{
			displayName: '文本内容',
			name: 'content',
			type: 'string',
			typeOptions: {
				rows: 10,
			},
			required: true,
			default: '',
			description: '文本内容，长度范围 1 ~ 10485760 字符',
		},
		{
			displayName: '用户 ID 类型',
			name: 'user_id_type',
			type: 'options',
			default: 'open_id',
			options: [
				{
					name: 'Open_id',
					value: 'open_id',
					description: '标识一个用户在某个应用中的身份',
				},
				{
					name: 'Union_id',
					value: 'union_id',
					description: '标识一个用户在某个应用开发商下的身份',
				},
				{
					name: 'User_id',
					value: 'user_id',
					description: '标识一个用户在某个租户内的身份',
				},
			],
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
		const content_type = this.getNodeParameter('content_type', index) as string;
		const content = this.getNodeParameter('content', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const qs: IDataObject = { user_id_type };
		const body: IDataObject = { content_type, content };

		const requestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: '/open-apis/docx/v1/documents/blocks/convert',
			qs,
			body,
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default DocBlockConvertOperate;
