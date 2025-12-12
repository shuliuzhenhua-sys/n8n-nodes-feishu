import { IDataObject, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';

const MessageImageUploadOperate: ResourceOperations = {
	name: '上传图片',
	value: 'message:imageUpload',
	options: [
		{
			displayName: '图片类型',
			name: 'image_type',
			type: 'options',
			options: [
				{
					name: '用于发送消息',
					value: 'message',
				},
				{
					name: '用于设置头像',
					value: 'avatar',
				},
			],
			required: true,
			default: 'message',
			description: '图片类型。message：用于发送消息；avatar：用于设置头像',
		},
		{
			displayName: '二进制文件字段',
			name: 'fileFieldName',
			type: 'string',
			default: 'data',
			required: true,
			description: '输入数据中包含图片二进制数据的字段名',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const image_type = this.getNodeParameter('image_type', index) as string;
		const fileFieldName = this.getNodeParameter('fileFieldName', index) as string;
		const file = (await NodeUtils.buildUploadFileData.call(this, fileFieldName, index)) as any;

		if (!file || !file.value) {
			throw new NodeOperationError(this.getNode(), '未找到图片数据，请检查二进制文件字段名是否正确');
		}

		return RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/im/v1/images',
			formData: {
				image_type,
				image: file,
			},
		});
	},
};

export default MessageImageUploadOperate;
