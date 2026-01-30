import { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { commonOptions } from '../../../help/utils/sharedOptions';

const MessageBatchProgressOperate: ResourceOperations = {
	name: '查询批量消息整体进度',
	value: 'message:batchProgress',
	order: 80,
	options: [
		{
			displayName: '批量消息任务ID',
			name: 'batch_message_id',
			type: 'string',
			required: true,
			default: '',
			description:
				'待查询的批量消息任务 ID，该 ID 为批量发送消息接口返回值中的 message_id 字段，用于标识一次批量发送消息请求',
		},
		commonOptions,
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const batch_message_id = this.getNodeParameter('batch_message_id', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: `/open-apis/im/v1/batch_messages/${batch_message_id}/get_progress`,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default MessageBatchProgressOperate;
