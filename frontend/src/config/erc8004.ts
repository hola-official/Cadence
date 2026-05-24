export const ERC8004_ADDRESSES = {
  identity:   '0x8004A818BFB912233c491871b3d84c89A494BD9e' as `0x${string}`,
  reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713' as `0x${string}`,
  validation: '0x8004Cb1BF31DAf7788923b405b754f57acEB4272' as `0x${string}`,
} as const

export const IDENTITY_REGISTRY_ABI = [
  { name: 'ownerOf',  type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { name: 'tokenURI', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
] as const

export const VALIDATION_REGISTRY_ABI = [
  {
    name: 'getValidationStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'requestHash', type: 'bytes32' }],
    outputs: [
      { name: 'validatorAddress', type: 'address' },
      { name: 'agentId',          type: 'uint256' },
      { name: 'response',         type: 'uint8' },
      { name: 'responseHash',     type: 'bytes32' },
      { name: 'tag',              type: 'string' },
      { name: 'lastUpdate',       type: 'uint256' },
    ],
  },
] as const
