import { IDataObject, IExecuteFunctions, IHttpRequestOptions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';
import FormData from 'form-data';
import {
	fileFieldNameOption,
	fileNameOption,
	batchingOption,
	timeoutOption,
} from '../../../help/utils/sharedOptions';

const AilyFileUploadOperate: ResourceOperations = {
	name: '文件上传',
	value: 'aily:fileUpload',
	order: 20,
	options: [
		fileFieldNameOption,
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					...fileNameOption,
					description: '带后缀的文件名，例如：test.pdf。不填则使用原始文件名',
				},
				batchingOption,
				timeoutOption,
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
			throw new NodeOperationError(
				this.getNode(),
				'未找到文件数据，请检查二进制文件字段名是否正确',
			);
		}

		// 使用 options 中的文件名，如果没有则使用原始文件名
		const file_name = options.file_name || file.options?.filename || 'file';

		const formData = new FormData();
		formData.append('file_name', file_name);
		formData.append('file', file.value);

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: '/open-apis/aily/v1/files',
			body: formData,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default AilyFileUploadOperate;
