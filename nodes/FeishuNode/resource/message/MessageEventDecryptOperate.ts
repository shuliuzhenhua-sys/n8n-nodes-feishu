import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperations } from '../../../help/type/IResource';
import * as crypto from 'crypto';

class AESCipher {
	private key: Buffer;

	constructor(key: string) {
		const hash = crypto.createHash('sha256');
		hash.update(key);
		this.key = hash.digest();
	}

	decrypt(encrypt: string): string | null {
		try {
			const encryptBuffer = Buffer.from(encrypt, 'base64');
			const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, encryptBuffer.slice(0, 16));
			let decrypted = decipher.update(encryptBuffer.slice(16).toString('hex'), 'hex', 'utf8');
			decrypted += decipher.final('utf8');
			return decrypted;
		} catch (err) {
			return null;
		}
	}
}

const MessageEventDecryptOperate: ResourceOperations = {
	name: '解密事件消息',
	value: 'message:eventDecrypt',
	options: [
		{
			displayName: 'Encrypt Key',
			name: 'encrypt_key',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
			description:
				'飞书开放平台应用的 Encrypt Key，用于解密事件消息。<a href="https://open.feishu.cn/document/event-subscription-guide/event-subscriptions/event-subscription-configure-/choose-a-subscription-mode/send-notifications-to-developers-server#e0dff53d" target="_blank">参考文档</a>',
		},
		{
			displayName: 'Encrypt Data',
			name: 'encrypt_data',
			type: 'string',
			required: true,
			default: '',
			description: '加密的事件数据，即请求体中的 encrypt 字段',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const encryptKey = this.getNodeParameter('encrypt_key', index) as string;
		const encryptData = this.getNodeParameter('encrypt_data', index) as string;

		const cipher = new AESCipher(encryptKey);
		const decryptedData = cipher.decrypt(encryptData);

		if (!decryptedData) {
			throw new Error('解密失败，请检查 Encrypt Key 是否正确');
		}

		try {
			return JSON.parse(decryptedData) as IDataObject;
		} catch (err) {
			throw new Error('解密后的数据不是有效的 JSON 格式');
		}
	},
};

export default MessageEventDecryptOperate;
