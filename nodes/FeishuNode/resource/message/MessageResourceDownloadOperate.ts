import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import {
	binaryPropertyNameOption,
	fileNameOption,
	mimeTypeOption,
	batchingOption,
	timeoutOption,
} from '../../../help/utils/sharedOptions';

const MessageResourceDownloadOperate: ResourceOperations = {
	name: '获取消息中的资源文件',
	value: 'message:resourceDownload',
	order: 181,
	options: [
		{
			displayName: '消息ID',
			name: 'message_id',
			type: 'string',
			required: true,
			default: '',
			description: '待查询的消息 ID。可通过发送消息接口响应结果的 message_id 参数获取，或通过监听接收消息事件、获取会话历史消息接口获取',
		},
		{
			displayName: '资源Key',
			name: 'file_key',
			type: 'string',
			required: true,
			default: '',
			description: '待查询资源的 Key。你可以调用获取指定消息的内容接口，通过消息 ID 获取消息内容中的资源 Key。注意：路径参数 file_key 和 message_id 需要匹配',
		},
		{
			displayName: '资源类型',
			name: 'type',
			type: 'options',
			options: [
				{
					name: '图片',
					value: 'image',
					description: '对应消息中的图片或富文本消息中的图片',
				},
				{
					name: '文件',
					value: 'file',
					description: '对应消息中的文件、音频、视频（表情包除外）',
				},
			],
			required: true,
			default: 'image'
		},
		binaryPropertyNameOption,
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
				fileNameOption,
				{
					...mimeTypeOption,
					description:
						'自定义文件的 MIME 类型。如不填写，将自动识别。常见类型：image/png、image/jpeg、application/pdf、video/mp4、audio/opus',
				},
				batchingOption,
				timeoutOption,
			],
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const file_key = this.getNodeParameter('file_key', index) as string;
		const type = this.getNodeParameter('type', index) as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			file_name?: string;
			fileName?: string; // 兼容旧数据
			mimeType?: string;
			timeout?: number;
		};

		const buffer = await RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/im/v1/messages/${message_id}/resources/${file_key}`,
			qs: {
				type,
			},
			encoding: 'arraybuffer',
			json: false,
			timeout: options.timeout || undefined,
		});

		// 兼容旧数据：优先使用 file_name，其次使用 fileName
		const fileName = (options.file_name || options.fileName)?.trim() || undefined;
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

export default MessageResourceDownloadOperate;
