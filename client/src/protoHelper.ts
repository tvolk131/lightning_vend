import {Price} from '../../proto_ts_gen/lightning_vend/model_pb';

export const getParentOfProtoName = (protoName: string): string => {
  if (protoName.includes('//')) {
    return '';
  }

  const split = protoName.split('/');
  split.pop();
  split.pop();
  if (split.length % 2 === 0) {
    return split.join('/');
  }
  return '';
};

export const getPriceDisplayString = (price?: Price): string => {
  if (!price) {
    return 'Unknown price';
  }

  switch (price.getDenominationCase()) {
    case Price.DenominationCase.BTC_SATS:
      return `${price.getBtcSats()} sats`;
    case Price.DenominationCase.USD_CENTS:
      {
        let dollars = 0;
        let cents = price.getUsdCents();
        let isNegative = false;
        if (cents < 0) {
          cents = -cents;
          isNegative = true;
        }
        while (cents > 100) {
          dollars += 1;
          cents -= 100;
        }
        let centsString = `${cents}`.padStart(2, '0');
        return `${isNegative ? '-' : ''}$${dollars}.${centsString}`;
      }
    case Price.DenominationCase.DENOMINATION_NOT_SET:
      return 'Unknown price';
  }
};
