import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const SpreadsheetTableCreateOperate: ResourceOperations = {
	name: '创建电子表格',
	value: 'spreadsheet:create',
	order: 100,
	options: [
		{
			displayName: '表格标题',
			name: 'title',
			type: 'string',
			default: '',
			description: '表格标题。',
		},
		{
			displayName: '文件夹 Token',
			name: 'folder_toke',
			type: 'string',
			default: ''
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const title = this.getNodeParameter('title', index) as string;
		const folder_token = this.getNodeParameter('folder_toke', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const body: IDataObject = {};
		if (title) body.title = title;
		if (folder_token) body.folder_token = folder_token;

		const requestOptions: IDataObject = { method: 'POST', url: '/open-apis/sheets/v3/spreadsheets', body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default SpreadsheetTableCreateOperate;
