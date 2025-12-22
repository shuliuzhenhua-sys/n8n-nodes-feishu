import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const SpreadsheetCellsReplaceOperate: ResourceOperations = {
	name: '替换单元格',
	value: 'spreadsheet:replaceCells',
	order: 80,
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
			displayName: '工作表 ID',
			name: 'sheetId',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: '查找范围',
			name: 'range',
			type: 'string',
			required: true,
			default: '',
			description: '查找范围，格式为 &lt;sheetId&gt;!&lt;开始位置&gt;:&lt;结束位置&gt;。',
		},
		{
			displayName: '查找字符串',
			name: 'find',
			type: 'string',
			required: true,
			default: '',
			description: '查找的字符串。',
		},
		{
			displayName: '替换字符串',
			name: 'replacement',
			type: 'string',
			required: true,
			default: '',
			description: '替换的字符串。',
		},
		{
			displayName: '是否忽略查找字符串的大小写',
			name: 'matchCase',
			type: 'boolean',
			default: false,
		},
		{
			displayName: '字符串是否需要完全匹配整个单元格',
			name: 'matchEntireCell',
			type: 'boolean',
			default: false,
		},
		{
			displayName: '是否使用正则表达式查找',
			name: 'searchByRegex',
			type: 'boolean',
			default: false,
		},
		{
			displayName: '是否仅搜索单元格公式',
			name: 'includeFormulas',
			type: 'boolean',
			default: false,
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spreadsheetToken = this.getNodeParameter('spreadsheetToke', index) as string;
		const sheetId = this.getNodeParameter('sheetId', index) as string;
		const range = this.getNodeParameter('range', index) as string;
		const find = this.getNodeParameter('find', index) as string;
		const replacement = this.getNodeParameter('replacement', index) as string;
		const matchCase = this.getNodeParameter('matchCase', index) as boolean;
		const matchEntireCell = this.getNodeParameter('matchEntireCell', index) as boolean;
		const searchByRegex = this.getNodeParameter('searchByRegex', index) as boolean;
		const includeFormulas = this.getNodeParameter('includeFormulas', index) as boolean;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const body: IDataObject = { find_condition: { range, match_case: matchCase, match_entire_cell: matchEntireCell, search_by_regex: searchByRegex, include_formulas: includeFormulas }, find, replacement };
		const requestOptions: IDataObject = { method: 'POST', url: `/open-apis/sheets/v3/spreadsheets/${spreadsheetToken}/sheets/${sheetId}/replace`, body };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default SpreadsheetCellsReplaceOperate;
