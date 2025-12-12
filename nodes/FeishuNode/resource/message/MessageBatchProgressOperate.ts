import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const MessageBatchProgressOperate: ResourceOperations = {
	name: '查询批量消息整体进度',
	value: 'message:batchProgress',
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
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const batch_message_id = this.getNodeParameter('batch_message_id', index) as string;

		return RequestUtils.request.call(this, {
			method: 'GET',
			url: `/open-apis/im/v1/batch_messages/${batch_message_id}/get_progress`,
		});
	},
};

export default MessageBatchProgressOperate;
