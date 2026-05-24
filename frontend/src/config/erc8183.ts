export const ERC8183_ADDRESS = '0x0747EEf0706327138c69792bF28Cd525089e4583' as `0x${string}`

export const JOB_STATUS = ['Open', 'Funded', 'Submitted', 'Completed', 'Rejected', 'Expired'] as const
export type JobStatus = typeof JOB_STATUS[number]

export const AGENTIC_COMMERCE_ABI = [
  {
    name: 'setBudget',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId',     type: 'uint256' },
      { name: 'amount',    type: 'uint256' },
      { name: 'optParams', type: 'bytes'   },
    ],
    outputs: [],
  },
  {
    name: 'fund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId',     type: 'uint256' },
      { name: 'optParams', type: 'bytes'   },
    ],
    outputs: [],
  },
  {
    name: 'submit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId',       type: 'uint256'  },
      { name: 'deliverable', type: 'bytes32'  },
      { name: 'optParams',   type: 'bytes'    },
    ],
    outputs: [],
  },
  {
    name: 'complete',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'jobId',     type: 'uint256'  },
      { name: 'reason',    type: 'bytes32'  },
      { name: 'optParams', type: 'bytes'    },
    ],
    outputs: [],
  },
  {
    name: 'createJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'provider',  type: 'address' },
      { name: 'evaluator', type: 'address' },
      { name: 'expiredAt', type: 'uint256' },
      { name: 'description', type: 'string' },
      { name: 'hook',      type: 'address' },
    ],
    outputs: [{ name: 'jobId', type: 'uint256' }],
  },
  {
    name: 'getJob',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id',          type: 'uint256' },
          { name: 'client',      type: 'address' },
          { name: 'provider',    type: 'address' },
          { name: 'evaluator',   type: 'address' },
          { name: 'description', type: 'string' },
          { name: 'budget',      type: 'uint256' },
          { name: 'expiredAt',   type: 'uint256' },
          { name: 'status',      type: 'uint8' },
          { name: 'hook',        type: 'address' },
        ],
      },
    ],
  },
  {
    name: 'JobCreated',
    type: 'event',
    inputs: [
      { indexed: true,  name: 'jobId',     type: 'uint256' },
      { indexed: true,  name: 'client',    type: 'address' },
      { indexed: true,  name: 'provider',  type: 'address' },
      { indexed: false, name: 'evaluator', type: 'address' },
      { indexed: false, name: 'expiredAt', type: 'uint256' },
      { indexed: false, name: 'hook',      type: 'address' },
    ],
    anonymous: false,
  },
  {
    name: 'JobCompleted',
    type: 'event',
    inputs: [
      { indexed: true,  name: 'jobId',    type: 'uint256' },
      { indexed: false, name: 'reason',   type: 'bytes32' },
    ],
    anonymous: false,
  },
] as const
