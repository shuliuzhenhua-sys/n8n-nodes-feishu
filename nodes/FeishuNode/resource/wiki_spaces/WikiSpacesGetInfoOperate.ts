import {IDataObject, IExecuteFunctions, INodeProperties} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const WikiSpacesGetInfoOperate: ResourceOperations = {
	name: '获取知识空间信息',
	value: 'wiki:spaces:info',
	order: 100,
	options: [
		{
			displayName: '知识空间ID',
			name: 'space_id',
			type: 'string',
			required: true,
			default: '',
			description: '知识空间ID，可从知识空间列表获取。',
		},
		{
			displayName: '语言',
			name: 'lang',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{ name: '简体中文', value: 'zh' },
				{ name: '印尼语', value: 'id' },
				{ name: '德语', value: 'de' },
				{ name: '英语', value: 'en' },
				{ name: '西班牙语', value: 'es' },
				{ name: '法语', value: 'fr' },
				{ name: '意大利语', value: 'it' },
				{ name: '葡萄牙语', value: 'pt' },
				{ name: '越南语', value: 'vi' },
				{ name: '俄语', value: 'ru' },
				{ name: '印地语', value: 'hi' },
				{ name: '泰语', value: 'th' },
				{ name: '韩语', value: 'ko' },
				{ name: '日语', value: 'ja' },
				{ name: '繁体中文（中国香港）', value: 'zh-HK' },
				{ name: '繁体中文（中国台湾）', value: 'zh-TW' },
			],
			default: 'zh',
			description: '返回的文档库名称展示语言。',
		},
		{ displayName: 'Options', name: 'options', type: 'collection', placeholder: 'Add option', default: {}, options: [{ displayName: 'Batching', name: 'batching', placeholder: 'Add Batching', type: 'fixedCollection', typeOptions: { multipleValues: false }, default: { batch: {} }, options: [{ displayName: 'Batching', name: 'batch', values: [{ displayName: 'Items per Batch', name: 'batchSize', type: 'number', typeOptions: { minValue: 1 }, default: 50, description: '每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。' }, { displayName: 'Batch Interval (Ms)', name: 'batchInterval', type: 'number', typeOptions: { minValue: 0 }, default: 1000, description: '每批请求之间的时间（毫秒）。0 表示禁用。' }] }] }, { displayName: 'Timeout', name: 'timeout', type: 'number', typeOptions: { minValue: 0 }, default: 0, description: '等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。' }] },
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const spaceId = this.getNodeParameter('space_id', index) as string;
		const lang = this.getNodeParameter('lang', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
		timeout?: number;
	};
		const requestOptions: IDataObject = { method: 'GET', url: `/open-apis/wiki/v2/spaces/${spaceId}`, qs: { lang } };
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default WikiSpacesGetInfoOperate;
