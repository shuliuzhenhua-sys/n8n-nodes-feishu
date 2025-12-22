import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';
import RequestUtils from '../../../help/utils/RequestUtils';

export default {
	name: '创建任务',
	value: 'task:create',
	order: 100,
	options: [
		{
			displayName: '任务标题',
			name: 'summary',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '任务摘要',
			name: 'description',
			type: 'string',
			default: '',
		},
		{
			displayName: '用户 ID 类型',
			name: 'user_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
			],
			description: '用户 ID 类型。',
			default: 'open_id',
		},
		{
			displayName: '其他参数',
			name: 'body',
			type: 'json',
			required: true,
			default: '{}',
			description:
				'参考：https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/task-v2/task/create#requestBody',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const summary = this.getNodeParameter('summary', index) as string;
		const description = this.getNodeParameter('description', index) as string;
		const user_id_type = this.getNodeParameter('user_id_type', index) as string;
		const extObject = NodeUtils.getNodeJsonData(this, "body", index) as IDataObject;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const body = { summary, description, ...extObject };
		const requestOptions: IDataObject = { method: 'POST', url: `/open-apis/task/v2/tasks`, qs: { user_id_type }, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},

} as ResourceOperations;
