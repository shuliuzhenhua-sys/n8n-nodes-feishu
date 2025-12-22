import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const WikiSpacesNodeGetInfoOperate: ResourceOperations = {
	name: '获取知识空间节点信息',
	value: 'wiki:spaces:node:info',
	order: 90,
	options: [
		{
			displayName: '节点Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: '知识库节点或对应云文档的实际token',
		},
		{
			displayName: '文档类型',
			name: 'obj_type',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{ name: '知识库节点', value: 'wiki' },
				{ name: '旧版文档', value: 'doc' },
				{ name: '新版文档', value: 'docx' },
				{ name: '表格', value: 'sheet' },
				{ name: '思维导图', value: 'mindnote' },
				{ name: '多维表格', value: 'bitable' },
				{ name: '文件', value: 'file' },
				{ name: '幻灯片', value: 'slides' }
			],
			default: 'wiki',
			description: '文档类型，不传时默认以wiki类型查询',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const token = this.getNodeParameter('token', index) as string;
		const objType = this.getNodeParameter('obj_type', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const qs: IDataObject = { token };
		if (objType !== 'wiki') qs.obj_type = objType;

		const requestOptions: IDataObject = { method: 'GET', url: '/open-apis/wiki/v2/spaces/get_node', qs };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default WikiSpacesNodeGetInfoOperate;
