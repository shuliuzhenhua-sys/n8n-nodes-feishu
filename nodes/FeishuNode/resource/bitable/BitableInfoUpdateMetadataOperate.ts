import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const BitableInfoUpdateMetadataOperate: ResourceOperations = {
	name: '更新多维表格元数据',
	value: 'bitable:updateMetadata',
	order: 50,
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
			displayName: '多维表格名称',
			name: 'name',
			type: 'string',
			default: '',
			description: '多维表格 App 名称。',
		},
		{
			displayName: '是否开启高级权限',
			name: 'enable_advanced_permissions',
			type: 'boolean',
			default: false,
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
		const name = this.getNodeParameter('name', index, '') as string;
		const enable_advanced_permissions = this.getNodeParameter(
			'enable_advanced_permissions',
			index,
			false,
		) as boolean;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		const body: IDataObject = {};
		if (name) body.name = name;
		body.enable_advanced_permissions = enable_advanced_permissions;

		const requestOptions: IHttpRequestOptions = {
			method: 'PUT',
			url: `/open-apis/bitable/v1/apps/${app_token}`,
			body,
		};
		if (options.timeout) requestOptions.timeout = options.timeout;

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default BitableInfoUpdateMetadataOperate;
