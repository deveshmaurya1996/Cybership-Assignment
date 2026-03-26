export type IsoCountryCode = string;

export type Address = {
  name?: string;
  lines: string[];
  city: string;
  stateProvince?: string;
  postalCode: string;
  countryCode: IsoCountryCode;
  residential?: boolean;
};

export type PackageDimensions = {
  weightLb: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
};

export type RateRequest = {
  origin: Address;
  destination: Address;
  packages: PackageDimensions[];
  shipperAccountNumber?: string;
  serviceLevel?: string;
};

export type Money = {
  currency: string;
  amount: string;
};

export type RateQuote = {
  carrierId: string;
  serviceCode: string;
  serviceName: string;
  totalCharge: Money;
  billingWeight?: {
    unitCode: string;
    weight: string;
  };
  zone?: string;
};
