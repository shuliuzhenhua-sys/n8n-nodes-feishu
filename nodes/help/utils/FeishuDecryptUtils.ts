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

/**
 * 解密飞书事件消息
 * @param encryptKey 飞书开放平台应用的 Encrypt Key
 * @param encryptData 加密的事件数据，即请求体中的 encrypt 字段
 * @returns 解密后的 JSON 字符串，如果解密失败返回 null
 */
export function decryptFeishuEvent(encryptKey: string, encryptData: string): string | null {
	const cipher = new AESCipher(encryptKey);
	return cipher.decrypt(encryptData);
}
