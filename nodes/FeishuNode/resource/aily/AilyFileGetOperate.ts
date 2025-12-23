import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const AilyFileGetOperate: ResourceOperations = {
	name: '读取文件基础信息',
	value: 'aily:fileGet',
	options: [
		{
			displayName: '文件 ID',
			name: 'file_id',
			type: 'string',
			required: true,
			default: '',
			description: '文件的唯一 ID，参考上传文件接口响应',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: '获取预览地址',
					name: 'with_preview_url',
					type: 'boolean',
					default: false,
					description: 'Whether to get the preview URL of the file based on file_id',
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
		const file_id = this.getNodeParameter('file_id', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			with_preview_url?: boolean;
			timeout?: number;
		};

		const qs: IDataObject = {};

		if (options.with_preview_url) {
			qs.with_preview_url = options.with_preview_url;
		}

		// 构建请求选项
		const requestOptions: IDataObject = {
			method: 'GET' as IHttpRequestMethods,
			url: `/open-apis/aily/v1/files/${file_id}`,
			qs,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		const response = await RequestUtils.request.call(this, requestOptions);

		return response as IDataObject;
	},
};

export default AilyFileGetOperate;

