import { IDataObject, IExecuteFunctions, IHttpRequestOptions, NodeOperationError } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';
import FormData from 'form-data';

const MessageImageUploadOperate: ResourceOperations = {
	name: '上传图片',
	value: 'message:imageUpload',
	order: 150,
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
			displayName: 'Input Data Field Name',
			name: 'fileFieldName',
			type: 'string',
			default: 'data',
			required: true,
			description: 'The name of the incoming field containing the binary file data to be processe',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const image_type = this.getNodeParameter('image_type', index) as string;
		const fileFieldName = this.getNodeParameter('fileFieldName', index) as string;
		const file = (await NodeUtils.buildUploadFileData.call(this, fileFieldName, index)) as any;

		if (!file || !file.value) {
			throw new NodeOperationError(
				this.getNode(),
				'未找到图片数据，请检查二进制文件字段名是否正确',
			);
		}

		const formData = new FormData();
		formData.append('image_type', image_type);
		formData.append('image', file.value);

		return RequestUtils.request.call(this, {
			method: 'POST',
			url: '/open-apis/im/v1/images',
			body: formData,
		} as IHttpRequestOptions);
	},
};

export default MessageImageUploadOperate;
