import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const AilySkillGetOperate: ResourceOperations = {
	name: '获取技能信息',
	value: 'aily:skillGet',
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
			options: [
				{
					displayName: 'Batching',
					name: 'batching',
					placeholder: 'Add Batching',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: false,
					},
					default: {
						batch: {},
					},
					options: [
						{
							displayName: 'Batching',
							name: 'batch',
							values: [
								{
									displayName: 'Items per Batch',
									name: 'batchSize',
									type: 'number',
									typeOptions: {
										minValue: 1,
									},
									default: 50,
									description:
										'每批并发请求数量。添加此选项后启用并发模式。0 将被视为 1。',
								},
								{
									displayName: 'Batch Interval (Ms)',
									name: 'batchInterval',
									type: 'number',
									typeOptions: {
										minValue: 0,
									},
									default: 1000,
									description: '每批请求之间的时间（毫秒）。0 表示禁用。',
								},
							],
						},
					],
				},
				{
					displayName: 'Timeout',
					name: 'timeout',
					type: 'number',
					typeOptions: {
						minValue: 0,
					},
					default: 0,
					description:
						'等待服务器发送响应头（并开始响应体）的时间（毫秒），超过此时间将中止请求。0 表示不限制超时。',
				},
			],
		},
	] as INodeProperties[],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const app_id = this.getNodeParameter('app_id', index) as string;
		const skill_id = this.getNodeParameter('skill_id', index) as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		// 构建请求选项
		const requestOptions: IDataObject = {
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

