import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const SpaceFileDownloadOperate: ResourceOperations = {
	name: '下载文件',
	value: 'space:fileDownload',
	options: [
		{
			displayName: '文件Token',
			name: 'file_token',
			// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
			type: 'string',
			required: true,
			default: '',
			description: '文件的 token，获取方式见文件概述',
		},
		{
			displayName: 'Put Output File in Field',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			description: 'The name of the output binary field to put the file in',
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
						'自定义文件的 MIME 类型。如不填写，将自动识别。常见类型：application/pdf、video/mp4、audio/opus',
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

		const buffer = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/drive/v1/files/${file_token}/download`,
			encoding: 'arraybuffer',
			json: false,
		});

		const fileName = options.fileName?.trim() || undefined;
		const mimeType = options.mimeType?.trim() || undefined;

		const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, mimeType);

		return {
			binary: {
				[binaryPropertyName]: binaryData,
			},
			json: {
				file_token,
				fileName,
				mimeType,
			},
		};
	},
};

export default SpaceFileDownloadOperate;
