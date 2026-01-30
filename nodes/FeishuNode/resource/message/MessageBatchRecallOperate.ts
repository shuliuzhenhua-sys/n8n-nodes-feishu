import { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { commonOptions } from '../../../help/utils/sharedOptions';

const MessageBatchRecallOperate: ResourceOperations = {
	name: '批量撤回消息',
	value: 'message:batchRecall',
	order: 70,
	options: [
		{
			displayName: '待撤回的批量消息任务ID',
			name: 'batch_message_id',
			type: 'string',
			required: true,
			default: '',
			description:
				'待撤回的批量消息任务 ID，该 ID 为批量发送消息接口返回值中的message_id字段，用于标识一次批量发送消息请求。',
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
			method: 'DELETE',
			url: `/open-apis/im/v1/batch_messages/${batch_message_id}`,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default MessageBatchRecallOperate;
