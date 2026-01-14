import { IDataObject } from 'n8n-workflow';

interface PendingResponse {
	resolve: (value: IDataObject) => void;
	reject: (reason?: any) => void;
	timeout: NodeJS.Timeout;
}

/**
 * 飞书响应管理器
 * 用于管理 Trigger 和 Respond to Feishu 节点之间的通信
 */
class FeishuResponseManager {
	private pendingResponses: Map<string, PendingResponse> = new Map();

	/**
	 * 等待响应
	 * @param executionId 执行ID
	 * @param timeout 超时时间（毫秒）
	 * @returns Promise<IDataObject>
	 */
	waitForResponse(executionId: string, timeout: number = 30000): Promise<IDataObject> {
		return new Promise((resolve, reject) => {
			const timeoutHandle = setTimeout(() => {
				this.pendingResponses.delete(executionId);
				reject(new Error(`Response timeout for execution: ${executionId}`));
			}, timeout);

			this.pendingResponses.set(executionId, {
				resolve,
				reject,
				timeout: timeoutHandle,
			});
		});
	}

	/**
	 * 发送响应
	 * @param executionId 执行ID
	 * @param response 响应数据
	 * @returns boolean 是否成功发送
	 */
	sendResponse(executionId: string, response: IDataObject): boolean {
		const pending = this.pendingResponses.get(executionId);
		if (pending) {
			clearTimeout(pending.timeout);
			pending.resolve(response);
			this.pendingResponses.delete(executionId);
			return true;
		}
		return false;
	}

	/**
	 * 检查是否有等待的响应
	 * @param executionId 执行ID
	 * @returns boolean
	 */
	hasPendingResponse(executionId: string): boolean {
		return this.pendingResponses.has(executionId);
	}

	/**
	 * 取消等待的响应
	 * @param executionId 执行ID
	 */
	cancelResponse(executionId: string): void {
		const pending = this.pendingResponses.get(executionId);
		if (pending) {
			clearTimeout(pending.timeout);
			pending.reject(new Error('Response cancelled'));
			this.pendingResponses.delete(executionId);
		}
	}

	/**
	 * 清除所有等待的响应
	 */
	clearAll(): void {
		for (const [, pending] of this.pendingResponses) {
			clearTimeout(pending.timeout);
			pending.reject(new Error('All responses cleared'));
		}
		this.pendingResponses.clear();
	}
}

// 导出单例
export const feishuResponseManager = new FeishuResponseManager();
