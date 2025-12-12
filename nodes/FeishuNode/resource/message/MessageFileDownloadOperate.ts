import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const MessageFileDownloadOperate: ResourceOperations = {
	name: '下载文件',
	value: 'message:fileDownload',
	options: [
		{
			displayName: '文件Key',
			name: 'file_key',
			type: 'string',
			required: true,
			default: '',
			description: '文件的 Key，通过上传文件接口上传文件后，从返回结果中获取',
		},
		{
			displayName: '输出字段名',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			description: '用于存储下载文件的二进制数据的字段名',
		},
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
				{
					displayName: '自定义文件名',
					name: 'fileName',
					type: 'string',
					default: '',
					description: '自定义保存的文件名（包含扩展名）',
				},
				{
					displayName: 'MIME Type',
					name: 'mimeType',
					type: 'string',
					default: '',
					description:
						'自定义文件的 MIME 类型。如不填写，将使用响应头中的 Content-Type。常见类型：application/pdf、video/mp4、audio/opus',
				},
			],
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const file_key = this.getNodeParameter('file_key', index) as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			fileName?: string;
			mimeType?: string;
		};

		const response = await RequestUtils.originRequest.call(this, {
			method: 'GET',
			url: `/open-apis/im/v1/files/${file_key}`,
			json: false,
			encoding: null,
			resolveWithFullResponse: true,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
			},
		});

		// 获取响应的 content-type，优先使用用户自定义的 MIME Type
		const contentType =
			options.mimeType?.trim() ||
			response.headers?.['content-type'] ||
			'application/octet-stream';

		// 尝试从 Content-Disposition 获取文件名
		let defaultFileName = file_key;
		const contentDisposition = response.headers?.['content-disposition'];
		if (contentDisposition) {
			const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
			if (match && match[1]) {
				defaultFileName = match[1].replace(/['"]/g, '');
				// 处理 URL 编码的文件名
				try {
					defaultFileName = decodeURIComponent(defaultFileName);
				} catch {
					// 解码失败时保持原样
				}
			}
		}

		// 使用自定义文件名或从响应中获取的文件名
		const fileName = options.fileName?.trim() || defaultFileName;

		// 将二进制数据准备为 n8n 可以处理的格式
		const binaryData = await this.helpers.prepareBinaryData(
			Buffer.from(response.body),
			fileName,
			contentType,
		);

		return {
			binary: {
				[binaryPropertyName]: binaryData,
			},
			json: {
				file_key,
				fileName,
				mimeType: contentType,
			},
		};
	},
};

export default MessageFileDownloadOperate;
