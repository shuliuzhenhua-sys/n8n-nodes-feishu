import {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';
import { BaseUrl } from '../nodes/help/type/enums';

export class FeishuNodeCredentialsApi implements ICredentialType {
	name = 'feishuNodeCredentialsApi';
	displayName = '飞书租户维度 API';
	icon = 'file:icon.svg' as const;
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'options',
			options: [
				{
					name: `${BaseUrl.China}`,
					value: `${BaseUrl.China}`,
					description: '飞书开放平台 API 地址（中国）',
				},
				{
					name: `${BaseUrl.Global}`,
					value: `${BaseUrl.Global}`,
					description: 'Larksuite 开放平台 API 地址（海外）',
				},
				{
					name: '自定义',
					value: 'custom',
					description: '自定义 URL',
				},
			],
			default: BaseUrl.China,
			required: true,
		},
		{
			displayName: '自定义 URL',
			name: 'customUrl',
			type: 'string',
			default: '',
			placeholder: 'https://custom.domain',
			hint: '必须以 "https://" 或 "http://" 开头',
			displayOptions: {
				show: {
					url: ['custom'],
				},
			},
		},
		{
			displayName: 'URL',
			name: 'baseURL',
			type: 'hidden',
			default: '={{$self["url"] === "custom" ? $self["customUrl"] : $self["url"]}}',
		},
		{
			displayName: 'Appid',
			description: '开放平台应用的唯一标识。可以在开发者后台的 凭证与基础信息 页面查看 app_id',
			name: 'appid',
			type: 'string',
			default: '',
		},
		{
			displayName: 'AppSecret',
			name: 'appsecret',
			description: '应用的秘钥',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'AccessToken',
			name: 'accessToken',
			type: 'hidden',
			default: '',
			typeOptions: {
				expirable: true,
			},
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {

		const res = (await this.helpers.httpRequest({
			method: 'POST',
			baseURL: credentials.baseURL as string,
			url: '/open-apis/auth/v3/app_access_token/internal',
			body: {
				app_id: credentials.appid,
				app_secret: credentials.appsecret,
			},
		})) as any;

		// console.log('preAuthentication res:', res);

		if (res.code && res.code !== 0) {
			throw new Error('授权失败：' + res.code + ', ' + res.msg);
		}

		return { accessToken: res.tenant_access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseURL}}',
			url: '/open-apis/auth/v3/app_access_token/internal',
			method: 'POST',
			body: {
				app_id: '={{$credentials.appid}}',
				app_secret: '={{$credentials.appsecret}}',
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					message: '参数错误',
					key: 'code',
					value: 10003,
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					message: 'App Secret 无效',
					key: 'code',
					value: 10014,
				},
			},
		],
	};
}
