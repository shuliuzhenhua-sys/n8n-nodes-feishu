import { IDataObject, IExecuteFunctions, INodeProperties, IHttpRequestOptions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const BitableInfoGetMetadataOperate: ResourceOperations = {
	name: '获取多维表格元数据',
	value: 'bitable:getMetadata',
	order: 40,
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
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};
		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: `/open-apis/bitable/v1/apps/${app_token}`,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		return RequestUtils.request.call(this, requestOptions);
	},
};

export default BitableInfoGetMetadataOperate;
