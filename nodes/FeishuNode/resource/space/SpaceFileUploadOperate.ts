import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';

const SpaceFileUploadOperate: ResourceOperations = {
	name: '上传文件',
	value: 'space:fileUpload',
	order: 51,
	options: [
		{
			displayName: '文件夹 Token',
			name: 'parent_node',
			type: 'string',
			required: true,
			default: '',
			description: '云空间中文件夹的 token，获取方式见飞书文档',
		},
		{
			displayName: '二进制文件字段',
			name: 'fileFieldName',
			type: 'string',
			default: 'data',
			required: true,
			description: '输入数据中包含文件二进制数据的字段名',
		},
		{
			displayName: '选项',
			name: 'options',
			type: 'collection',
			placeholder: '添加选项',
			default: {},
			options: [
				{
					displayName: '文件名',
					name: 'file_name',
					type: 'string',
					default: '',
					description: '自定义文件名，例如：demo.pdf。留空则从二进制数据中自动获取。最大长度250字符',
				},
				{
					displayName: '文件校验和',
					name: 'checksum',
					type: 'string',
					default: '',
					description: '文件的 Adler-32 校验和',
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
		const parent_node = this.getNodeParameter('parent_node', index) as string;
		const fileFieldName = this.getNodeParameter('fileFieldName', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			file_name?: string;
			checksum?: string;
			timeout?: number;
		};

		const file = (await NodeUtils.buildUploadFileData.call(this, fileFieldName, index)) as any;

		if (!file || !file.value) {
			throw new NodeOperationError(this.getNode(), '未找到文件数据，请检查二进制文件字段名是否正确');
		}

		// 优先使用用户定义的文件名，否则从二进制数据中获取
		const file_name = options.file_name || file.options?.filename;
		if (!file_name) {
			throw new NodeOperationError(this.getNode(), '文件名不能为空，请在选项中指定文件名或确保二进制数据包含文件名');
		}

		if (file_name.length > 250) {
			throw new NodeOperationError(this.getNode(), '文件名长度不能超过250字符');
		}

		const fileSize = file.value.length;
		if (fileSize > 20971520) {
			throw new NodeOperationError(this.getNode(), '文件大小不能超过20MB，如需上传更大文件请使用分片上传接口');
		}

		const formData: IDataObject = {
			file_name,
			parent_type: 'explorer',
			parent_node,
			size: fileSize,
			file,
		};

		// 添加可选的校验和参数
		if (options.checksum) {
			formData.checksum = options.checksum;
		}

		// 构建请求选项
		const requestOptions: IDataObject = {};
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/drive/v1/files/upload_all',
			formData,
			...requestOptions,
		});
	},
};

export default SpaceFileUploadOperate;

