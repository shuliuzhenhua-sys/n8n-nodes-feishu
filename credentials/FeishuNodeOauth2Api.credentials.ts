import { ICredentialType, INodeProperties } from 'n8n-workflow';
import { BaseUrl } from '../nodes/help/type/enums';

// eslint-disable-next-line n8n-nodes-base/cred-class-name-missing-oauth2-suffix
export class FeishuNodeOauth2Api implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-missing-oauth2
	name = 'feishuNodeOauth2Api';

	extends = ['oAuth2Api'];

	displayName = '飞书个人用户维度 OAuth2 API';

	icon = 'file:icon.svg' as const;
	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
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
			displayName: '自定义 Access Token URL',
			name: 'customAccessTokenUrl',
			type: 'string',
			default: '',
			placeholder: 'https://custom.domain/open-apis/authen/v2/oauth/token',
			displayOptions: {
				show: {
					url: ['custom'],
				},
			},
		},
		{
			displayName: '自定义授权 URL',
			name: 'customAuthorizationUrl',
			type: 'string',
			default: '',
			placeholder: 'https://custom.domain/open-apis/authen/v1/authorize',
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
			displayName: `单次最多可向用户请求 50 个权限范围。建议包含 offline_access。<a target="_blank" href="https://open.feishu.cn/document/authentication-management/access-token/obtain-oauth-code?#bc6d1214">更多详情</a>`,
			name: 'suggestion',
			type: 'notice',
			default: '',
		},
		{
			displayName: '权限范围',
			name: 'authScope',
			type: 'string',
			hint: '格式：offline_access,contact:contact,bitable:app。<a target="_blank" href="https://open.feishu.cn/document/server-docs/application-scope/scope-list">权限列表</a>',
			default: 'offline_access',
			required: true,
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default:
				'={{$self["url"] === "custom" ? $self["customAuthorizationUrl"] : $self["url"] === "https://open.feishu.cn" ? "https://accounts.feishu.cn/open-apis/authen/v1/authorize" : "https://accounts.larksuite.com/open-apis/authen/v1/authorize"}}',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default:
				'={{$self["url"] === "custom" ? $self["customAccessTokenUrl"] : $self["url"] === "https://open.feishu.cn" ? "https://open.feishu.cn/open-apis/authen/v2/oauth/token" : "https://open.larksuite.com/open-apis/authen/v2/oauth/token"}}',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '={{$self["authScope"].replace(/,/g, " ").trim()}}',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
