import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import NodeUtils from '../../../help/utils/NodeUtils';

export default {
	name: '批量删除记录',
	value: 'bitable:table:record:batchDelete',
	order: 230,
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
			displayName: '请求体JSON',
			name: 'body',
			type: 'json',
			required: true,
			default: '{"records":[]}',
			description:
				'参考：https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/batch_delete#requestBody',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_token = this.getNodeParameter('app_toke', index) as string;
		const table_id = this.getNodeParameter('table_id', index) as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index) as IDataObject;

		return RequestUtils.request.call(this, {
			method: 'POST',
			url: `/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records/batch_delete`,
			body: body,
		});
	},
} as ResourceOperations;
