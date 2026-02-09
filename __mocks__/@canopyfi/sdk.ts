// Mock @canopyfi/sdk
export const getCanopyProgramId = jest
  .fn()
  .mockReturnValue('CNPYPRHDLsJwKsHULPfSTEiTPrAup41ZRR7TGeK3cn5G');
export const getRpcEndpoint = jest.fn().mockReturnValue('https://api.devnet.solana.com');
export const detectNetwork = jest.fn().mockReturnValue('devnet');

export const CANOPY_PROGRAM_ID = 'CNPYPRHDLsJwKsHULPfSTEiTPrAup41ZRR7TGeK3cn5G';
export const CANOPY_PROGRAM_IDS = {
  mainnet: 'canopYNMusfENJfeHfVqwvME3Z724EFnrfzRs9Bn8gE',
  devnet: 'CNPYPRHDLsJwKsHULPfSTEiTPrAup41ZRR7TGeK3cn5G',
  localnet: 'CNpYpdAvW86xMdz93bn6BHSc8YNv3QTpmpUUjU9w4Rdu',
};

export const RPC_ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  localnet: 'http://localhost:8899',
};

export const PlotStatus = {
  Offered: { offered: {} },
  Accepted: { accepted: {} },
  InterestGathering: { interestGathering: {} },
  Allocating: { allocating: {} },
  Collecting: { collecting: {} },
  Deposited: { deposited: {} },
  Cancelled: { cancelled: {} },
  Concluded: { concluded: {} },
};

export const WateringStatus = {
  Interested: { interested: {} },
  Allocated: { allocated: {} },
  Deposited: { deposited: {} },
  Rejected: { rejected: {} },
  Refunded: { refunded: {} },
};

export const WateringAction = {
  Indicate: { indicate: {} },
  Allocate: { allocate: {} },
  Deposit: { deposit: {} },
  Reject: { reject: {} },
  Refund: { refund: {} },
};

export class CanopyClient {
  constructor() {}
  static create = jest.fn().mockResolvedValue(new CanopyClient());
}

export class PlotClient {
  constructor() {}
  static create = jest.fn().mockResolvedValue(new PlotClient());
}

export class WateringClient {
  constructor() {}
  static create = jest.fn().mockResolvedValue(new WateringClient());
}

export const derivePlotPda = jest.fn().mockReturnValue(['mockPlotPda', 255]);
export const deriveGrovePda = jest.fn().mockReturnValue(['mockGrovePda', 255]);
