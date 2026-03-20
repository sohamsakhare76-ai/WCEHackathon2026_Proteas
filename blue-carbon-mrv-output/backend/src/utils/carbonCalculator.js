// backend/src/utils/carbonCalculator.js
/**
 * Blue Carbon Calculator
 * Based on IPCC Wetlands Supplement (2013) & IUCN Blue Carbon Initiative
 *
 * Sequestration rates (tCO₂e / ha / year):
 *   Mangrove   : 6.00
 *   Seagrass   : 1.38
 *   Salt Marsh : 2.18
 */

const SEQUESTRATION_RATES = {
  MANGROVE:   6.00,
  SEAGRASS:   1.38,
  SALT_MARSH: 2.18,
};

const STOCK_AT_MATURITY = { // tC/ha converted to tCO2e (×3.67)
  MANGROVE:   100,
  SEAGRASS:   70,
  SALT_MARSH: 50,
};

const MATURITY_YEARS = {
  MANGROVE:   20,
  SEAGRASS:   10,
  SALT_MARSH: 15,
};

function calculateCarbon(areaHectares, ecosystemType, growthYears) {
  const type = (ecosystemType || "").toUpperCase().replace(" ", "_");

  if (!SEQUESTRATION_RATES[type])
    throw new Error(`Unknown ecosystem: ${ecosystemType}. Use MANGROVE, SEAGRASS, or SALT_MARSH`);
  if (areaHectares <= 0) throw new Error("Area must be > 0 hectares");
  if (growthYears  <= 0) throw new Error("Growth years must be > 0");

  const rate        = SEQUESTRATION_RATES[type];
  const maturityYrs = MATURITY_YEARS[type];
  const stockTCha   = STOCK_AT_MATURITY[type];

  const annualSeq        = rate * areaHectares * growthYears;
  const maturityFraction = Math.min(growthYears / maturityYrs, 1.0);
  const biomassCarbon    = stockTCha * maturityFraction * areaHectares * 3.67;
  const carbonTonnes     = Math.round((annualSeq + biomassCarbon) * 0.80 * 100) / 100;

  return {
    carbonTonnes,
    breakdown: {
      annualSequestration_tCO2e: Math.round(annualSeq     * 100) / 100,
      biomassStockCarbon_tCO2e:  Math.round(biomassCarbon * 100) / 100,
      uncertaintyDiscount:       "20%",
      sequestrationRate:         rate,
      maturityFraction:          Math.round(maturityFraction * 100) + "%",
    },
    methodology: {
      source:    "IPCC Wetlands Supplement 2013 / IUCN Blue Carbon",
      ecosystem: type,
      years:     growthYears,
      areaHa:    areaHectares,
    },
  };
}

module.exports = { calculateCarbon, SEQUESTRATION_RATES };
