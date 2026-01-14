/**
 * 输出类型枚举
 */
export declare const enum OutputType {
	Single = 'single',
	Multiple = 'multiple',
	None = 'none',
}

/**
 * 凭证类型枚举
 */
export declare const enum Credentials {
	FeishuCredentialsApi = 'feishuNodeCredentialsApi',
	FeishuOauth2Api = 'feishuNodeOauth2Api',
}

/**
 * 触发事件类型枚举
 */
export enum TriggerEventType {
	ReceiveMessage = 'im.message.receive_v1',
}

/**
 * 文件类型枚举
 */
export enum FileType {
	Bitable = 'bitable',
	Docx = 'docx',
	Folder = 'folder',
	File = 'file',
	Slides = 'slides',
}

/**
 * API 基础 URL 枚举
 */
export enum BaseUrl {
	China = 'https://open.feishu.cn',
	Global = 'https://open.larksuite.com',
}
