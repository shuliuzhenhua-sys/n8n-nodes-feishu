import { INodeProperties } from 'n8n-workflow';
import { ANY_EVENT } from './lark-sdk/consts';

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
 * Trigger 事件选择属性
 */
export const triggerEventProperty: INodeProperties = {
	displayName: '触发事件',
	name: 'events',
	type: 'multiOptions',
	required: true,
	options: [
		{
			name: '所有事件 (Any Event)',
			value: ANY_EVENT,
			description: '触发所有事件',
		},
		{
			name: '接收消息 (Receive Message)',
			value: TriggerEventType.ReceiveMessage,
			description: '当机器人收到用户发送的消息时触发',
		},
		{
			name: '新增消息表情回复 (Add Reaction)',
			value: 'im.message.reaction.created_v1',
			description: '当消息被添加表情回复时触发',
		},
		{
			name: '删除消息表情回复 (Delete Reaction)',
			value: 'im.message.reaction.deleted_v1',
			description: '当消息表情回复被删除时触发',
		},
		{
			name: '自定义菜单事件 (Bot Menu Event)',
			value: 'application.bot.menu_v6',
			description: '当用户点击机器人菜单时触发',
		},
		{
			name: '多维表格字段变更 (Bitable Field Changed)',
			value: 'drive.file.bitable_field_changed_v1',
			description: '当订阅的多维表格字段发生变更时触发',
		},
		{
			name: '多维表格记录变更 (Bitable Record Changed)',
			value: 'drive.file.bitable_record_changed_v1',
			description: '当订阅的多维表格记录发生变更时触发',
		},
		{
			name: '卡片回传交互 (Card Postback)',
			value: 'card.action.trigger',
			description: '当用户点击卡片上配置了回传交互的组件时触发',
		},
		{
			name: '机器人进群 (Bot Added to Group)',
			value: 'im.chat.member.bot.added_v1',
			description: '当机器人被添加到群聊时触发',
		},
		{
			name: '机器人被移出群 (Bot Removed from Group)',
			value: 'im.chat.member.bot.deleted_v1',
			description: '当机器人被移出群聊时触发',
		},
		{
			name: '用户进群 (User Added to Group)',
			value: 'im.chat.member.user.added_v1',
			description: '当用户被添加到群聊时触发',
		},
		{
			name: '用户出群 (User Removed from Group)',
			value: 'im.chat.member.user.deleted_v1',
			description: '当用户离开群聊时触发',
		},
		{
			name: '群解散 (Group Disbanded)',
			value: 'im.chat.disbanded_v1',
			description: '当群聊被解散时触发',
		},
		{
			name: '群配置变更 (Group Updated)',
			value: 'im.chat.updated_v1',
			description: '当群聊配置发生变更时触发',
		},
		{
			name: '消息已读 (Message Read)',
			value: 'im.message.message_read_v1',
			description: '当消息被已读时触发',
		},
		{
			name: '审批实例状态变更 (Approval Instance Status Changed)',
			value: 'approval.instance.status_changed_v4',
			description: '当审批实例状态发生变更时触发',
		},
		{
			name: '审批任务状态变更 (Approval Task Status Changed)',
			value: 'approval.task.status_changed_v4',
			description: '当审批任务状态发生变更时触发',
		},
	],
	default: [],
};
