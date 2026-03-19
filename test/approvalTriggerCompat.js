const assert = require('node:assert/strict');

const RequestHandle =
	require('../dist/nodes/help/utils/feishu-sdk/handler/request-handle').default;
const { CEventType } = require('../dist/nodes/help/utils/feishu-sdk/consts');

const logger = {
	debug() {},
	info() {},
	warn() {},
	error() {},
};

const requestHandle = new RequestHandle({ logger });

const instanceEvent = requestHandle.parse({
	event: {
		type: 'approval_instance',
	},
});

assert.equal(
	instanceEvent[CEventType],
	'approval.instance.status_changed_v4',
	'approval_instance 应该被标准化为 approval.instance.status_changed_v4',
);

const taskEvent = requestHandle.parse({
	event: {
		type: 'approval_task',
	},
});

assert.equal(
	taskEvent[CEventType],
	'approval.task.status_changed_v4',
	'approval_task 应该被标准化为 approval.task.status_changed_v4',
);

const legacyApprovalEvent = requestHandle.parse({
	event: {
		type: 'approval',
	},
});

assert.equal(
	legacyApprovalEvent[CEventType],
	'approval.instance.status_changed_v4',
	'approval 应该被标准化为 approval.instance.status_changed_v4',
);

console.log('approval trigger compatibility checks passed');
