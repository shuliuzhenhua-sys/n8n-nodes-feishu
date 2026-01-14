import { IDataObject } from 'n8n-workflow';

// 简化的事件处理接口，支持任意事件类型
export interface IHandles {
	[key: string]: ((data: IDataObject) => Promise<IDataObject | void> | IDataObject | void) | undefined;
}
