export interface PropFirmPreset {
  name: string;
  firm: string;
  accountSize: number;
  profitTarget: number;
  maxDrawdown: number;
  drawdownType: 'trailing' | 'static';
  dailyLossLimit: number | null;
  minDays: number;
  consistencyRule: number | null; // %
  profitSplit: number;            // %
  evalFee: number;
  activationFee: number;
}

/** Approximate current eval rules — editable in the UI. */
export const PROP_FIRM_PRESETS: Record<string, PropFirmPreset> = {
  topstep_50k:  { name: 'TopStep $50K',  firm: 'TopStep', accountSize: 50000,  profitTarget: 3000,  maxDrawdown: 2000,  drawdownType: 'trailing', dailyLossLimit: null, minDays: 2, consistencyRule: 50, profitSplit: 90, evalFee: 49,  activationFee: 149 },
  topstep_100k: { name: 'TopStep $100K', firm: 'TopStep', accountSize: 100000, profitTarget: 6000,  maxDrawdown: 3000,  drawdownType: 'trailing', dailyLossLimit: null, minDays: 2, consistencyRule: 50, profitSplit: 90, evalFee: 99,  activationFee: 149 },
  topstep_150k: { name: 'TopStep $150K', firm: 'TopStep', accountSize: 150000, profitTarget: 9000,  maxDrawdown: 4500,  drawdownType: 'trailing', dailyLossLimit: null, minDays: 2, consistencyRule: 50, profitSplit: 90, evalFee: 149, activationFee: 149 },

  apex_50k:   { name: 'Apex $50K',   firm: 'Apex', accountSize: 50000,  profitTarget: 3000,  maxDrawdown: 2500,  drawdownType: 'trailing', dailyLossLimit: null, minDays: 1, consistencyRule: 30, profitSplit: 90, evalFee: 167, activationFee: 0 },
  apex_100k:  { name: 'Apex $100K',  firm: 'Apex', accountSize: 100000, profitTarget: 6000,  maxDrawdown: 3000,  drawdownType: 'trailing', dailyLossLimit: null, minDays: 1, consistencyRule: 30, profitSplit: 90, evalFee: 207, activationFee: 0 },
  apex_150k:  { name: 'Apex $150K',  firm: 'Apex', accountSize: 150000, profitTarget: 9000,  maxDrawdown: 5000,  drawdownType: 'trailing', dailyLossLimit: null, minDays: 1, consistencyRule: 30, profitSplit: 90, evalFee: 297, activationFee: 0 },
  apex_250k:  { name: 'Apex $250K',  firm: 'Apex', accountSize: 250000, profitTarget: 15000, maxDrawdown: 6500,  drawdownType: 'trailing', dailyLossLimit: null, minDays: 1, consistencyRule: 30, profitSplit: 90, evalFee: 517, activationFee: 0 },

  tpt_50k:   { name: 'Take Profit Trader $50K',  firm: 'Take Profit Trader', accountSize: 50000,  profitTarget: 3000, maxDrawdown: 2000, drawdownType: 'trailing', dailyLossLimit: null, minDays: 5, consistencyRule: null, profitSplit: 90, evalFee: 150, activationFee: 130 },
  tpt_100k:  { name: 'Take Profit Trader $100K', firm: 'Take Profit Trader', accountSize: 100000, profitTarget: 6000, maxDrawdown: 3000, drawdownType: 'trailing', dailyLossLimit: null, minDays: 5, consistencyRule: null, profitSplit: 90, evalFee: 170, activationFee: 130 },
  tpt_150k:  { name: 'Take Profit Trader $150K', firm: 'Take Profit Trader', accountSize: 150000, profitTarget: 9000, maxDrawdown: 4500, drawdownType: 'trailing', dailyLossLimit: null, minDays: 5, consistencyRule: null, profitSplit: 90, evalFee: 330, activationFee: 130 },

  ftmo_25k:  { name: 'FTMO $25K',  firm: 'FTMO', accountSize: 25000,  profitTarget: 2500,  maxDrawdown: 2500,  drawdownType: 'static', dailyLossLimit: 1250,  minDays: 4, consistencyRule: null, profitSplit: 80, evalFee: 89,  activationFee: 0 },
  ftmo_50k:  { name: 'FTMO $50K',  firm: 'FTMO', accountSize: 50000,  profitTarget: 5000,  maxDrawdown: 5000,  drawdownType: 'static', dailyLossLimit: 2500,  minDays: 4, consistencyRule: null, profitSplit: 80, evalFee: 179, activationFee: 0 },
  ftmo_100k: { name: 'FTMO $100K', firm: 'FTMO', accountSize: 100000, profitTarget: 10000, maxDrawdown: 10000, drawdownType: 'static', dailyLossLimit: 5000,  minDays: 4, consistencyRule: null, profitSplit: 80, evalFee: 349, activationFee: 0 },
  ftmo_200k: { name: 'FTMO $200K', firm: 'FTMO', accountSize: 200000, profitTarget: 20000, maxDrawdown: 20000, drawdownType: 'static', dailyLossLimit: 10000, minDays: 4, consistencyRule: null, profitSplit: 80, evalFee: 599, activationFee: 0 },

  mff_50k:   { name: 'MyFundedFutures $50K',  firm: 'MyFundedFutures', accountSize: 50000,  profitTarget: 3000, maxDrawdown: 2000, drawdownType: 'trailing', dailyLossLimit: null, minDays: 0, consistencyRule: 40, profitSplit: 90, evalFee: 80,  activationFee: 0 },
  mff_100k:  { name: 'MyFundedFutures $100K', firm: 'MyFundedFutures', accountSize: 100000, profitTarget: 6000, maxDrawdown: 3000, drawdownType: 'trailing', dailyLossLimit: null, minDays: 0, consistencyRule: 40, profitSplit: 90, evalFee: 150, activationFee: 0 },
  mff_150k:  { name: 'MyFundedFutures $150K', firm: 'MyFundedFutures', accountSize: 150000, profitTarget: 9000, maxDrawdown: 4500, drawdownType: 'trailing', dailyLossLimit: null, minDays: 0, consistencyRule: 40, profitSplit: 90, evalFee: 220, activationFee: 0 },
};

/** Firms shown as selectable cards in the Add Account modal. */
export const FIRMS = ['TopStep', 'Apex', 'Take Profit Trader', 'Lucid', 'Tradeify', 'MyFundedFutures', 'FTMO', 'The5%ers', 'Otro'];

export function presetsForFirm(firm: string): PropFirmPreset[] {
  return Object.values(PROP_FIRM_PRESETS).filter(p => p.firm === firm);
}
