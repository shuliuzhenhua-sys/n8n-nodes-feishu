import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

export default  {
	name: '新增视图',
	value: 'bitable:table:view:add',
	order: 80,
	options: [
		{
			displayName: '多维表格 Token',
			name: 'app_toke',
			type: 'string',
			required: true,
			default: '',
			description: '多维表格 App 的唯一标识。',
		},
		{
			displayName: '多维表格 ID',
			name: 'table_id',
			type: 'string',
			required: true,
			default: '',
			description: '多维表格数据表的唯一标识。',
		},
		{
			displayName: '视图名称',
			name: 'view_name',
			type: 'string',
			required: true,
			default: '',
			description: '长度不超过 100 个字符, 不为空且不包含这些特殊符号：[ ]',
		},
		{
			displayName: '视图类型',
			name: 'view_type',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: '表格视图',
					value: 'grid',
				},
				{
					name: '看板视图',
					value: 'kanban',
				},
				{
					name: '画册视图',
					value: 'gallery',
				},
				{
					name: '甘特视图',
					value: 'gantt',
				},
				{
					name: '表单视图',
					value: 'form',
				},
			],
			default: 'grid',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = this.getNodeParameter('app_toke', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;
		const view_name = this.getNodeParameter('view_name', index) as string;
		const view_type = this.getNodeParameter('view_type', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const requestOptions: IDataObject = { method: 'POST', url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/views`, body: { view_name, view_type } };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
