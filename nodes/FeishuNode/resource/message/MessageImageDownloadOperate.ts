import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const MessageImageDownloadOperate: ResourceOperations = {
	name: '下载图片',
	value: 'message:imageDownload',
	order: 160,
	options: [
		{
			displayName: '图片Key',
			name: 'image_key',
			type: 'string',
			required: true,
			default: '',
			description: '图片的 Key，通过上传图片接口上传图片后，在返回结果中获取',
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
					description: '自定义图片的 MIME 类型。如不填写，将自动识别。常见类型：image/png、image/jpeg、image/gif',
				},
			],
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const image_key = this.getNodeParameter('image_key', index) as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			fileName?: string;
			mimeType?: string;
		};

		const buffer = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/im/v1/images/${image_key}`,
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
			json: binaryData,
		};
	},
};

export default MessageImageDownloadOperate;
