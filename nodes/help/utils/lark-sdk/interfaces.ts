export interface Cache {
	set: (
		key: string | symbol,
		value: any,
		expire?: number,
		options?: {
			namespace?: string;
		},
	) => Promise<boolean>;
	get: (
		key: string | symbol,
		options?: {
			namespace?: string;
		},
	) => Promise<any>;
}
