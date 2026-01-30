import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

export default {
	name: '更新视图',
	value: 'bitable:table:view:update',
	order: 140,
	options: [
		{
			displayName: '多维表格 App 的唯一标识',
			name: 'app_toke',
			type: 'string',
			required: true,
			default: '',
			description: '多维表格 App 的唯一标识。不同形态的多维表格，其 app_token 的获取方式不同，参考<a href="https://open.feishu.cn/document/ukTMukTMukTM/uUDN04SN0QjL1QDN/bitable-overview">多维表格 app_token 获取方式</a>获取。',
		},
		{
			displayName: '多维表格数据表的唯一标识',
			name: 'table_id',
			type: 'string',
			required: true,
			default: '',
			description: '你可通过多维表格 URL 获取 table_id',
		},
		{
			displayName: '视图 ID',
			name: 'view_id',
			type: 'string',
			required: true,
			default: '',
			description: '多维表格中视图的唯一标识。',
		},
		{
			displayName: '视图名称',
			name: 'view_name',
			type: 'string',
			default: '',
			description: '长度不超过 100 个字符, 不为空且不包含这些特殊符号：[ ]',
		},
		{
			displayName: '视图属性',
			name: 'property',
			type: 'json',
			default: '{}',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [batchingOption, timeoutOption],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = this.getNodeParameter('app_toke', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;
		const view_id = this.getNodeParameter('view_id', index) as string;
		const view_name = this.getNodeParameter('view_name', index) as string;
		const property = NodeUtils.getNodeJsonData(this, 'property', index) as IDataObject;

		const body: any = {};

		if (view_name) {
			body.view_name = view_name;
		}
		if (property) {
			body.property = property;
		}
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const requestOptions: IHttpRequestOptions = {
			method: 'PATCH',
			url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/views/${view_id}`,
			body,
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
} as ResourceOperations;
