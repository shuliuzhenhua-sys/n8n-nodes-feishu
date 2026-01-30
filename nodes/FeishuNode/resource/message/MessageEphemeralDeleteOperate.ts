import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const MessageEphemeralDeleteOperate: ResourceOperations = {
	name: '删除仅特定人可见的消息卡片',
	value: 'message:ephemeralDelete',
	order: 130,
	options: [
		{
			displayName: '消息ID',
			name: 'message_id',
			type: 'string',
			required: true,
			default: '',
			description: '消息 ID。调用发送仅特定人可见的消息卡片接口后，在返回结果中获取',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [batchingOption, timeoutOption],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const message_id = this.getNodeParameter('message_id', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const body: IDataObject = {
			message_id,
		};

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: '/open-apis/ephemeral/v1/delete',
			body,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default MessageEphemeralDeleteOperate;
