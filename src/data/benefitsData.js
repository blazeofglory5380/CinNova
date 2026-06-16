export const US_STATES = [
  { code: 'AL', name: 'Alabama' },   { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },   { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },{ code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut'},{ code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },   { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },    { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },      { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },     { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts'},{ code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire'},{ code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },{ code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina'},{ code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },      { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },    { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island'},{ code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota'},{ code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },     { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },   { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },{ code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export const mockPrograms = {
  federal: [
    {
      id: 'f1',
      name: 'FHA 203(k) Rehabilitation Loan',
      category: 'Federal',
      type: 'Loan',
      benefit: 'Finance purchase + renovation in a single loan',
      eligibility: ['Buyer', 'Investor'],
      maxAmount: '$431,250',
      description:
        'Combines home purchase and renovation costs into one FHA-backed mortgage. Ideal for fixer-uppers and value-add properties.',
    },
    {
      id: 'f2',
      name: 'VA Home Loan Guarantee',
      category: 'Federal',
      type: 'Loan Guarantee',
      benefit: 'Zero down payment, no PMI required',
      eligibility: ['Buyer'],
      maxAmount: 'No loan limit (conforming)',
      description:
        'For veterans, active-duty service members, and eligible surviving spouses. No down payment and no private mortgage insurance.',
    },
    {
      id: 'f3',
      name: 'USDA Rural Development Loan',
      category: 'Federal',
      type: 'Loan',
      benefit: 'Zero down payment in eligible rural areas',
      eligibility: ['Buyer', 'Homeowner'],
      maxAmount: 'Area-dependent',
      description:
        'Zero down payment mortgage for eligible rural and suburban homebuyers who meet income requirements.',
    },
    {
      id: 'f4',
      name: 'HUD Good Neighbor Next Door',
      category: 'Federal',
      type: 'Discount Program',
      benefit: '50% discount on HUD-listed homes',
      eligibility: ['Buyer'],
      maxAmount: '50% off list price',
      description:
        'Teachers, firefighters, EMTs, and law enforcement can purchase HUD-owned homes at 50% of list price in revitalization areas.',
    },
    {
      id: 'f5',
      name: 'Energy Efficient Mortgage (EEM)',
      category: 'Federal',
      type: 'Loan',
      benefit: 'Finance energy upgrades inside your mortgage',
      eligibility: ['Buyer', 'Homeowner', 'Investor'],
      maxAmount: '5% of property value or $8,000',
      description:
        'Allows borrowers to roll the cost of energy-efficient home improvements directly into their primary mortgage.',
    },
    {
      id: 'f6',
      name: 'Section 8 Housing Choice Voucher',
      category: 'Federal',
      type: 'Rental Subsidy',
      benefit: 'Government-guaranteed rental income for landlords',
      eligibility: ['Investor', 'Homeowner'],
      maxAmount: 'Fair-market rent',
      description:
        'HUD program paying a portion of rent directly to landlords who accept voucher holders. Reliable income stream for investors.',
    },
    {
      id: 'f7',
      name: 'Freddie Mac HomeOne',
      category: 'Federal',
      type: 'Mortgage',
      benefit: '3% down payment with no income limits',
      eligibility: ['Buyer'],
      maxAmount: 'Conforming loan limits',
      description:
        'Low down payment mortgage with no geographic or income restrictions for first-time homebuyers.',
    },
  ],

  state: {
    DEFAULT: [
      {
        id: 's1',
        name: 'State First-Time Homebuyer Program',
        category: 'State',
        type: 'Down Payment Assistance',
        benefit: 'Up to 5% down payment assistance',
        eligibility: ['Buyer'],
        maxAmount: '$15,000',
        description:
          'State-sponsored program providing down payment and closing cost assistance to qualifying first-time homebuyers.',
      },
      {
        id: 's2',
        name: 'State Historic Tax Credit',
        category: 'State',
        type: 'Tax Credit',
        benefit: 'Credit for certified historic rehabilitation',
        eligibility: ['Investor', 'Homeowner'],
        maxAmount: '25% of qualified rehab expenses',
        description:
          'Tax credits for rehabilitation of state-certified historic structures. Stackable with federal Historic Tax Credit.',
      },
      {
        id: 's3',
        name: 'State Housing Finance Agency Bond Loan',
        category: 'State',
        type: 'Below-Market Mortgage',
        benefit: 'Below-market interest rate mortgage',
        eligibility: ['Buyer'],
        maxAmount: 'Conforming loan limits',
        description:
          'Mortgages funded by tax-exempt bonds offering below-market interest rates to qualifying homebuyers.',
      },
    ],
    CA: [
      {
        id: 'ca1',
        name: 'CalHFA MyHome Assistance Program',
        category: 'State – California',
        type: 'Down Payment Assistance',
        benefit: 'Deferred-payment junior loan',
        eligibility: ['Buyer'],
        maxAmount: '3.5% of purchase price',
        description:
          'Provides a deferred-payment junior loan for down payment and/or closing costs, used with a CalHFA first mortgage.',
      },
      {
        id: 'ca2',
        name: 'California Dream For All',
        category: 'State – California',
        type: 'Shared Appreciation Loan',
        benefit: '20% down payment assistance',
        eligibility: ['Buyer'],
        maxAmount: '$150,000',
        description:
          'State shares in your home appreciation in exchange for providing 20% of the purchase price or up to $150,000.',
      },
      {
        id: 'ca3',
        name: 'CalHFA Zero Interest Program (ZIP)',
        category: 'State – California',
        type: 'Closing Cost Assistance',
        benefit: 'Zero-interest deferred loan for closing costs',
        eligibility: ['Buyer'],
        maxAmount: '$6,500',
        description:
          'Zero-interest second loan covering closing costs, deferred until the property is sold, refinanced, or paid off.',
      },
    ],
    TX: [
      {
        id: 'tx1',
        name: 'My First Texas Home',
        category: 'State – Texas',
        type: 'Mortgage + DPA',
        benefit: '30-year fixed rate + up to 5% DPA',
        eligibility: ['Buyer'],
        maxAmount: '5% of loan amount',
        description:
          'Combines a competitive 30-year fixed-rate mortgage with up to 5% down payment and closing cost assistance.',
      },
      {
        id: 'tx2',
        name: 'Texas Mortgage Credit Certificate (MCC)',
        category: 'State – Texas',
        type: 'Tax Credit',
        benefit: 'Federal tax credit on annual mortgage interest',
        eligibility: ['Buyer'],
        maxAmount: '$2,000/year',
        description:
          'Converts up to 20% of your annual mortgage interest into a direct federal tax credit, saving thousands over the loan life.',
      },
    ],
    FL: [
      {
        id: 'fl1',
        name: 'Florida Assist Second Mortgage',
        category: 'State – Florida',
        type: 'Down Payment Assistance',
        benefit: 'Deferred second mortgage, 0% interest',
        eligibility: ['Buyer'],
        maxAmount: '$10,000',
        description:
          'Non-amortizing 0% interest second mortgage for down payment and closing costs. Repayable only at sale or refinance.',
      },
      {
        id: 'fl2',
        name: 'Florida Homeownership Loan Program',
        category: 'State – Florida',
        type: 'Second Mortgage',
        benefit: '3% fixed-rate 15-year second mortgage',
        eligibility: ['Buyer'],
        maxAmount: '$10,000',
        description:
          'Low-interest second mortgage with monthly payments to assist with down payment and closing costs.',
      },
    ],
    NY: [
      {
        id: 'ny1',
        name: 'SONYMA Achieving the Dream',
        category: 'State – New York',
        type: 'Low-Rate Mortgage',
        benefit: 'Lowest available SONYMA interest rate',
        eligibility: ['Buyer'],
        maxAmount: 'County loan limits',
        description:
          'New York State lowest-rate mortgage for low-income first-time buyers. Includes down payment assistance.',
      },
      {
        id: 'ny2',
        name: 'NYC HomeFirst Down Payment Assistance',
        category: 'State – New York',
        type: 'Down Payment Grant',
        benefit: 'Up to $100,000 for NYC buyers',
        eligibility: ['Buyer'],
        maxAmount: '$100,000',
        description:
          'Forgivable loan of up to $100,000 for qualified first-time homebuyers purchasing in the five NYC boroughs.',
      },
    ],
  },

  county: [
    {
      id: 'c1',
      name: 'County Down Payment Assistance Grant',
      category: 'County',
      type: 'Grant',
      benefit: 'Up to $10,000 for down payment',
      eligibility: ['Buyer'],
      maxAmount: '$10,000',
      description:
        'County-level forgivable grant for income-qualified buyers purchasing within county limits. Funds are limited.',
    },
    {
      id: 'c2',
      name: 'Homestead Property Tax Exemption',
      category: 'County',
      type: 'Tax Exemption',
      benefit: 'Reduced annual property taxes',
      eligibility: ['Homeowner', 'Buyer'],
      maxAmount: 'Varies by county',
      description:
        'Reduces assessed value for property tax purposes for primary-residence homeowners. Apply through county assessor.',
    },
    {
      id: 'c3',
      name: 'County Residential Rehab Loan',
      category: 'County',
      type: 'Low-Interest Loan',
      benefit: '0–3% interest home improvement financing',
      eligibility: ['Homeowner', 'Investor'],
      maxAmount: '$25,000',
      description:
        'Low or zero-interest loans for income-eligible property owners to rehabilitate their primary residence.',
    },
    {
      id: 'c4',
      name: 'Community Development Block Grant (CDBG)',
      category: 'County',
      type: 'Grant',
      benefit: 'Federal dollars for local housing needs',
      eligibility: ['Homeowner', 'Investor', 'Buyer'],
      maxAmount: 'Project-dependent',
      description:
        'Federally-funded, locally-administered grants for housing rehabilitation and community development projects.',
    },
    {
      id: 'c5',
      name: 'Senior / Disabled Tax Freeze Program',
      category: 'County',
      type: 'Tax Relief',
      benefit: 'Freezes property tax assessment',
      eligibility: ['Homeowner'],
      maxAmount: 'Assessment freeze',
      description:
        'Locks in property tax assessment for qualifying seniors (65+) and disabled homeowners, preventing tax increases.',
    },
  ],

  city: [
    {
      id: 'ci1',
      name: 'City First-Time Buyer Grant',
      category: 'City',
      type: 'Forgivable Grant',
      benefit: 'Forgivable grant for qualifying buyers',
      eligibility: ['Buyer'],
      maxAmount: '$5,000',
      description:
        'City-issued forgivable grant for first-time homebuyers purchasing within city limits. Forgiven after 5 years of occupancy.',
    },
    {
      id: 'ci2',
      name: 'City Facade Improvement Program',
      category: 'City',
      type: 'Grant / Matching Loan',
      benefit: 'Exterior renovation funding',
      eligibility: ['Homeowner', 'Investor'],
      maxAmount: '$10,000',
      description:
        'Matching grants or low-interest loans for exterior improvements to residential and commercial properties in target areas.',
    },
    {
      id: 'ci3',
      name: 'City Land Bank Program',
      category: 'City',
      type: 'Discounted Property',
      benefit: 'Purchase city-owned vacant lots at discount',
      eligibility: ['Buyer', 'Investor'],
      maxAmount: '$1 symbolic (varies)',
      description:
        'Allows qualified buyers and developers to acquire city-owned vacant properties for redevelopment at nominal cost.',
    },
    {
      id: 'ci4',
      name: 'Landlord Incentive Program',
      category: 'City',
      type: 'Financial Incentive',
      benefit: 'Signing bonus for accepting housing vouchers',
      eligibility: ['Investor', 'Homeowner'],
      maxAmount: '$2,500 signing bonus',
      description:
        'Cash incentive for landlords who accept Section 8 housing vouchers, plus security deposit guarantee.',
    },
    {
      id: 'ci5',
      name: 'City Small Landlord Repair Fund',
      category: 'City',
      type: 'Low-Interest Loan',
      benefit: 'Affordable repairs to maintain housing quality',
      eligibility: ['Investor', 'Homeowner'],
      maxAmount: '$15,000',
      description:
        'Low-interest city loans for small landlords (1–4 units) to make repairs that maintain habitability standards.',
    },
  ],
};
