import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const MessageImageDownloadOperate: ResourceOperations = {
	name: '下载图片',
	value: 'message:imageDownload',
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
			displayName: '输出字段名',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			description: '用于存储下载图片的二进制数据的字段名',
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
					description: '自定义保存的文件名（不包含扩展名，扩展名会根据图片类型自动添加）',
				},
			],
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const image_key = this.getNodeParameter('image_key', index) as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
		const options = this.getNodeParameter('options', index, {}) as { fileName?: string };

		const response = await RequestUtils.originRequest.call(this, {
			method: 'GET',
			url: `/open-apis/im/v1/images/${image_key}`,
			json: false,
			encoding: null,
			resolveWithFullResponse: true,
		});

		// 获取响应的 content-type
		const contentType = response.headers['content-type'] || 'image/png';

		// 从 content-type 推断文件扩展名
		let fileExtension = 'png';
		if (contentType.includes('jpeg') || contentType.includes('jpg')) {
			fileExtension = 'jpg';
		} else if (contentType.includes('gif')) {
			fileExtension = 'gif';
		} else if (contentType.includes('webp')) {
			fileExtension = 'webp';
		} else if (contentType.includes('png')) {
			fileExtension = 'png';
		}

		// 使用自定义文件名或默认使用 image_key
		const baseName = options.fileName?.trim() || image_key;
		const fileName = `${baseName}.${fileExtension}`;

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
				image_key,
				fileName,
				mimeType: contentType,
			},
		};
	},
};

export default MessageImageDownloadOperate;
