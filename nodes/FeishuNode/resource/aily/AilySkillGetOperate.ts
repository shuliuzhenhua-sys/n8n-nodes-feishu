import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';
import { batchingOption, timeoutOption } from '../../../help/utils/sharedOptions';

const AilySkillGetOperate: ResourceOperations = {
	name: '获取技能信息',
	value: 'aily:skillGet',
	order: 50,
	options: [
		{
			displayName: '应用 ID',
			name: 'app_id',
			type: 'string',
			required: true,
			default: '',
			description: 'Aily 应用 ID（spring_xxx__c），可以在 Aily 应用开发页面的浏览器地址里获取',
		},
		{
			displayName: '技能 ID',
			name: 'skill_id',
			type: 'string',
			required: true,
			default: '',
			description: '技能 ID，可通过技能编辑页面的浏览器地址栏获取（skill_xxx）',
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
		const app_id = this.getNodeParameter('app_id', index) as string;
		const skill_id = this.getNodeParameter('skill_id', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 构建请求选项
		const requestOptions: IHttpRequestOptions = {
			method: 'GET' as IHttpRequestMethods,
			url: `/open-apis/aily/v1/apps/${app_id}/skills/${skill_id}`,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		const response = await RequestUtils.request.call(this, requestOptions);

		return response as IDataObject;
	},
};

export default AilySkillGetOperate;
