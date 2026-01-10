import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const SpaceFileDownloadOperate: ResourceOperations = {
	name: '下载文件',
	value: 'space:fileDownload',
	order: 60,
	options: [
		{
			displayName: '素材Token',
			name: 'file_token',
			type: 'string',
			required: true,
			default: '',
			description: '素材的唯一标识 Token，通过文件列表等接口获取',
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
		const file_token = this.getNodeParameter('file_token', index) as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			fileName?: string;
			mimeType?: string;
		};

		const response = await RequestUtils.originRequest.call(this, {
			method: 'GET',
			url: `/open-apis/drive/v1/medias/${file_token}/download`,
			json: false,
			encoding: null,
			resolveWithFullResponse: true,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
			},
		});

		const contentType =
			options.mimeType?.trim() ||
			response.headers?.['content-type'] ||
			'application/octet-stream';

		let defaultFileName = file_token;
		const contentDisposition = response.headers?.['content-disposition'];
		if (contentDisposition) {
			const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
			if (match && match[1]) {
				defaultFileName = match[1].replace(/['"]/g, '');
				try {
					defaultFileName = decodeURIComponent(defaultFileName);
				} catch {
					// 解码失败时保持原样
				}
			}
		}

		const fileName = options.fileName?.trim() || defaultFileName;

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
				file_token,
				fileName,
				fileSize: response.body.length,
				mimeType: contentType,
			},
		};
	},
};

export default SpaceFileDownloadOperate;
