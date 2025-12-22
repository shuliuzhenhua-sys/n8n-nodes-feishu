import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const SpreadsheetValuesReadOperate: ResourceOperations = {
	name: '读取单个范围',
	value: 'spreadsheet:valuesRead',
	order: 70,
	options: [
		{
			displayName: '电子表格 Token',
			name: 'spreadsheetToke',
			type: 'string',
			required: true,
			default: '',
			description: '电子表格的 token。',
		},
		{
			displayName: '范围',
			name: 'range',
			type: 'string',
			required: true,
			default: '',
			description: '查询范围。格式为 &lt;sheetId&gt;!&lt;开始位置&gt;:&lt;结束位置&gt;。',
		},
		{
			displayName: '值渲染选项',
			name: 'valueRenderOption',
			type: 'options',
			options: [
				{ name: 'ToString', value: 'ToString' },
				{ name: 'Formula', value: 'Formula' },
				{ name: 'FormattedValue', value: 'FormattedValue' },
				{ name: 'UnformattedValue', value: 'UnformattedValue' },
			],
			default: 'ToString',
			description: '指定单元格数据的格式。',
		},
		{
			displayName: '日期时间渲染选项',
			name: 'dateTimeRenderOption',
			type: 'options',
			options: [
				{ name: 'FormattedString', value: 'FormattedString' },
			],
			default: 'FormattedString',
			description: '指定数据类型为日期、时间、或时间日期的单元格数据的格式。',
		},
		{
			displayName: '用户 ID 类型',
			name: 'userIdType',
			type: 'options',
			options: [
				{ name: 'Open_id', value: 'open_id' },
				{ name: 'Union_id', value: 'union_id' },
			],
			default: 'open_id',
			description: '当单元格中包含@用户等涉及用户信息的元素时，该参数可指定返回的用户 ID 类型。',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spreadsheetToken = this.getNodeParameter('spreadsheetToke', index) as string;
		const range = this.getNodeParameter('range', index) as string;
		const valueRenderOption = this.getNodeParameter('valueRenderOption', index, '') as string;
		const dateTimeRenderOption = this.getNodeParameter('dateTimeRenderOption', index, '') as string;
		const userIdType = this.getNodeParameter('userIdType', index, 'lark_id') as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const qs: IDataObject = {};
		if (valueRenderOption) qs.valueRenderOption = valueRenderOption;
		if (dateTimeRenderOption) qs.dateTimeRenderOption = dateTimeRenderOption;
		if (userIdType) qs.user_id_type = userIdType;

		const requestOptions: IDataObject = { method: 'GET', url: `/open-apis/sheets/v2/spreadsheets/${spreadsheetToken}/values/${range}`, qs };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default SpreadsheetValuesReadOperate;
