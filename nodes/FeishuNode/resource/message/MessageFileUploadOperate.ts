import { IDataObject, IExecuteFunctions, IHttpRequestOptions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';
import FormData from 'form-data';

const MessageFileUploadOperate: ResourceOperations = {
	name: '上传文件',
	value: 'message:fileUpload',
	order: 170,
	options: [
		{
			displayName: '文件类型',
			name: 'file_type',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'OPUS 音频文件',
					value: 'opus',
				},
				{
					name: 'MP4 视频文件',
					value: 'mp4',
				},
				{
					name: 'PDF 格式文件',
					value: 'pdf',
				},
				{
					name: 'DOC 格式文件',
					value: 'doc',
				},
				{
					name: 'XLS 格式文件',
					value: 'xls',
				},
				{
					name: 'PPT 格式文件',
					value: 'ppt',
				},
				{
					name: 'Stream 格式文件（其他类型）',
					value: 'stream',
				},
			],
			required: true,
			default: 'stream',
			description: '待上传的文件类型。若上传文件不属于以上枚举类型，可以使用 stream 格式',
		},
		{
			displayName: 'Input Data Field Name',
			name: 'fileFieldName',
			type: 'string',
			default: 'data',
			required: true,
			description: 'The name of the incoming field containing the binary file data to be processed',
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
					name: 'file_name',
					type: 'string',
					default: '',
					description: '带后缀的文件名，例如：测试视频.mp4。不填则自动使用原始文件名',
				},
				{
					displayName: '文件时长（毫秒）',
					name: 'duration',
					type: 'number',
					default: 0,
					description: '文件的时长（视频、音频），单位：毫秒。不传值时无法显示文件的具体时长',
				},
			],
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const file_type = this.getNodeParameter('file_type', index) as string;
		const fileFieldName = this.getNodeParameter('fileFieldName', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			file_name?: string;
			duration?: number;
		};

		const file = (await NodeUtils.buildUploadFileData.call(this, fileFieldName, index)) as any;

		if (!file || !file.value) {
			throw new NodeOperationError(
				this.getNode(),
				'未找到文件数据，请检查二进制文件字段名是否正确',
			);
		}

		// 优先使用用户设置的文件名，否则使用原始文件名
		const file_name = options.file_name || file.options?.filename;

		if (!file_name) {
			throw new NodeOperationError(this.getNode(), '文件名不能为空，请在选项中设置文件名');
		}

		const formData = new FormData();
		formData.append('file_type', file_type);
		formData.append('file_name', file_name);
		formData.append('file', file.value);

		// 添加可选的时长参数
		if (options.duration && options.duration > 0) {
			formData.append('duration', options.duration.toString());
		}

		return RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/im/v1/files',
			body: formData,
		} as IHttpRequestOptions);
	},
};

export default MessageFileUploadOperate;
