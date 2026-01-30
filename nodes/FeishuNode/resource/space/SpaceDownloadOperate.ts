import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const SpaceDownloadOperate: ResourceOperations = {
	name: '下载素材',
	value: 'space:mediaDownload',
	order: 15,
	description: '下载各类云文档中的素材，例如电子表格中的图片',
	options: [
		{
			displayName: '素材 Token',
			name: 'file_token',
			// eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
			type: 'string',
			required: true,
			default: '',
			description:
				'素材的 token。参考<a href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/media/introduction">素材概述</a>了解如何获取素材 token',
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
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
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
				{
					displayName: 'Extra',
					name: 'extra',
					type: 'string',
					default: '',
					description:
						'拥有高级权限的多维表格在下载素材时，需要添加额外的扩展信息作为 URL 查询参数鉴权。详情参考<a href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/drive-v1/media/introduction#3b8635d3">素材概述-extra 参数说明</a>。格式示例：{"bitablePerm":{"tableId":"tblXXX","attachments":{"fldXXX":{"recXXX":["boxXXX"]}}}}',
				},
				{
					displayName: 'Batching',
					name: 'batching',
					placeholder: 'Add Batching',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: false,
					},
					default: {
						batch: {},
					},
					options: [
						{
							displayName: 'Batching',
							name: 'batch',
							values: [
								{
									displayName: 'Items per Batch',
									name: 'batchSize',
									type: 'number',
									typeOptions: {
										minValue: 1,
									},
									default: 50,
									description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。',
								},
								{
									displayName: 'Batch Interval (Ms)',
									name: 'batchInterval',
									type: 'number',
									typeOptions: {
										minValue: 0,
									},
									default: 1000,
									description: '每批请求之间的时间（毫秒）。0 表示禁用。',
								},
							],
						},
					],
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
		const file_token = this.getNodeParameter('file_token', index) as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			fileName?: string;
			mimeType?: string;
			extra?: string;
			timeout?: number;
		};

		// 构建 URL，处理 extra 参数
		let url = `/open-apis/drive/v1/medias/${file_token}/download`;
		if (options.extra) {
			// 序列化 Extra 对象成字符串并进行 URL 编码
			const encodedExtra = encodeURIComponent(options.extra);
			url += `?extra=${encodedExtra}`;
		}

		const buffer = await RequestUtils.request.call(this, {
			method: 'GET',
			url,
			encoding: 'arraybuffer',
			json: false,
			timeout: options.timeout || undefined,
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

export default SpaceDownloadOperate;
