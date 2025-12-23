import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';

const AilyFileUploadOperate: ResourceOperations = {
	name: '文件上传',
	value: 'aily:fileUpload',
	options: [
		{
			displayName: '二进制文件字段',
			name: 'fileFieldName',
			type: 'string',
			default: 'data',
			required: true,
			description: '输入数据中包含文件二进制数据的字段名',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: '文件名',
					name: 'file_name',
					type: 'string',
					default: '',
					description: '带后缀的文件名，例如：test.pdf。不填则使用原始文件名',
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
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const fileFieldName = this.getNodeParameter('fileFieldName', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			file_name?: string;
			timeout?: number;
		};

		const file = (await NodeUtils.buildUploadFileData.call(this, fileFieldName, index)) as any;

		if (!file || !file.value) {
			throw new NodeOperationError(this.getNode(), '未找到文件数据，请检查二进制文件字段名是否正确');
		}

		// 使用 options 中的文件名，如果没有则使用原始文件名
		const file_name = options.file_name || file.options?.filename || 'file';

		// 同步更新文件对象中的 filename
		if (options.file_name && file.options) {
			file.options.filename = options.file_name;
		}

		const formData: IDataObject = {
			file_name,
			file,
		};

		// 构建请求选项
		const requestOptions: IDataObject = {
			method: 'POST',
			url: '/open-apis/aily/v1/files',
			formData,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default AilyFileUploadOperate;

