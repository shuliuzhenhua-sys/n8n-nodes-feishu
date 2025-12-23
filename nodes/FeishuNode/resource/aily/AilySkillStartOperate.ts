import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	IHttpRequestMethods,
} from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperations } from '../../../help/type/IResource';

const AilySkillStartOperate: ResourceOperations = {
	name: '调用技能',
	value: 'aily:skillStart',
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
			displayName: 'Global Variable',
			name: 'global_variable',
			type: 'json',
			default: '{}',
			description: '技能的全局变量，JSON 格式，包含 query（消息文本）、files（文件列表）、channel（渠道信息）等字段',
		},
		{
			displayName: 'Input',
			name: 'input',
			type: 'string',
			default: '',
			description: '技能的自定义变量，JSON 字符串格式，如 {"custom_string":"my string","custom_integer":22}',
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
		const global_variable = this.getNodeParameter('global_variable', index, '{}') as string;
		const input = this.getNodeParameter('input', index, '') as string;
		const options = this.getNodeParameter('options', index, {}) as {
			timeout?: number;
		};

		const body: IDataObject = {};

		// 添加全局变量
		if (global_variable && global_variable !== '{}') {
			try {
				body.global_variable = JSON.parse(global_variable);
			} catch {
				body.global_variable = global_variable;
			}
		}

		// 添加自定义变量
		if (input) {
			body.input = input;
		}

		// 构建请求选项
		const requestOptions: IDataObject = {
			method: 'POST' as IHttpRequestMethods,
			url: `/open-apis/aily/v1/apps/${app_id}/skills/${skill_id}/start`,
			body,
		};

		// 添加超时配置
		if (options.timeout) {
			requestOptions.timeout = options.timeout;
		}

		const response = await RequestUtils.request.call(this, requestOptions);

		return response as IDataObject;
	},
};

export default AilySkillStartOperate;

